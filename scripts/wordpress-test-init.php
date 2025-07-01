<?php
/**
 * WordPress Test Environment Initialization
 * This mu-plugin automatically sets up WordPress for testing
 */

// Wait for WordPress to be fully loaded
add_action('init', function() {
    // Create test user with application password if not exists
    $username = 'testuser';
    $email = 'test@example.com';
    
    if (!username_exists($username)) {
        $user_id = wp_create_user($username, 'test-password-123', $email);
        
        if (!is_wp_error($user_id)) {
            // Make the user an administrator
            $user = new WP_User($user_id);
            $user->set_role('administrator');
            
            // Enable application passwords for this user
            update_user_meta($user_id, '_application_passwords_permissions', array(
                'read' => true,
                'write' => true,
                'delete' => true
            ));
            
            // Create an application password
            $app_password = WP_Application_Passwords::create_new_application_password($user_id, array(
                'name' => 'Test Application',
                'app_id' => 'test-app-123'
            ));
            
            if (!is_wp_error($app_password)) {
                // Log the application password for tests to use
                error_log('Test User Created: ' . $username);
                error_log('Application Password: ' . $app_password[0]);
                
                // Store in option for easy retrieval
                update_option('test_app_password', $app_password[0]);
                update_option('test_user_id', $user_id);
            }
        }
    }
    
    // Create some test content
    if (wp_count_posts()->publish < 2) {
        // Create test posts
        wp_insert_post(array(
            'post_title' => 'Test Post 1',
            'post_content' => 'This is test content for post 1',
            'post_status' => 'publish',
            'post_author' => get_option('test_user_id', 1)
        ));
        
        wp_insert_post(array(
            'post_title' => 'Test Post 2',
            'post_content' => 'This is test content for post 2',
            'post_status' => 'publish',
            'post_author' => get_option('test_user_id', 1)
        ));
    }
    
    // Ensure REST API is enabled
    add_filter('rest_enabled', '__return_true');
    add_filter('rest_jsonp_enabled', '__return_true');
    
    // Fix REST API authentication for Apache
    if (!isset($_SERVER['HTTP_AUTHORIZATION']) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
});

// Output test credentials on admin dashboard
add_action('admin_notices', function() {
    $app_password = get_option('test_app_password');
    if ($app_password) {
        echo '<div class="notice notice-info"><p>';
        echo '<strong>Test Credentials:</strong><br>';
        echo 'Username: testuser<br>';
        echo 'App Password: ' . esc_html($app_password) . '<br>';
        echo 'Use these for API testing';
        echo '</p></div>';
    }
});

// REST API endpoint to get test credentials
add_action('rest_api_init', function() {
    register_rest_route('test/v1', '/credentials', array(
        'methods' => 'GET',
        'callback' => function() {
            return array(
                'username' => 'testuser',
                'app_password' => get_option('test_app_password', ''),
                'user_id' => get_option('test_user_id', 0),
                'site_url' => get_site_url()
            );
        },
        'permission_callback' => '__return_true'
    ));
});