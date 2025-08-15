#!/bin/bash
# Quick fix for handler signatures in TypeScript files

cd /Users/thomas/Programming/mcp-wordpress/src/tools

# Function to fix handler signatures and parameter usage
fix_file() {
    local file="$1"
    echo "Fixing $file..."
    
    # Create a backup
    cp "$file" "$file.bak"
    
    # Fix handler signatures (simple sed approach)
    # Replace specific parameter types with Record<string, unknown>
    sed -i '' 's/params: { id: number }/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: { id: number; force?: boolean }/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: CreatePostRequest/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: UpdatePostRequest & { id: number }/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: PostQueryParams/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: CreatePageRequest/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: UpdatePageRequest & { id: number }/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: PageQueryParams/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: CreateUserRequest/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: UpdateUserRequest & { id: number }/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: CreateCategoryRequest/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: UpdateCategoryRequest & { id: number }/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: CreateTagRequest/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: UpdateTagRequest & { id: number }/params: Record<string, unknown>/g' "$file"
    sed -i '' 's/params: SiteQueryParams/params: Record<string, unknown>/g' "$file"
    
    echo "Fixed signatures in $file"
}

# Fix each file
for file in pages.ts performance.ts site.ts taxonomies.ts users.ts; do
    if [ -f "$file" ]; then
        fix_file "$file"
    fi
done

echo "Handler signature fixes completed!"