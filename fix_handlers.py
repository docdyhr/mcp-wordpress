#!/usr/bin/env python3
"""
Fix TypeScript handler signature issues in tool files
"""

import os
import re
from pathlib import Path

def fix_handler_signature(content, method_name):
    """Fix a handler method signature to use Record<string, unknown>"""
    
    # Pattern to match the method signature
    pattern = rf'(public async {method_name}\(\s*client: WordPressClient,\s*)params: [^)]+(\): Promise<unknown>)'
    
    # Replace with Record<string, unknown>
    replacement = r'\1params: Record<string, unknown>\2'
    
    return re.sub(pattern, replacement, content, flags=re.MULTILINE)

def add_type_assertion(content, method_name, original_type):
    """Add type assertion after the method signature"""
    
    # Find the method and add type assertion on the next line
    pattern = rf'(public async {method_name}\(\s*client: WordPressClient,\s*params: Record<string, unknown>\): Promise<unknown> \{)\s*(\n\s*try \{)?'
    
    # Create the type assertion
    if 'UpdateCommentRequest & { id: number }' in original_type:
        assertion = '\n    const typedParams = params as UpdateCommentRequest & { id: number };'
    elif '{ id: number; force?: boolean }' in original_type:
        assertion = '\n    const { id, force } = params as { id: number; force?: boolean };'
    elif '{ id: number }' in original_type:
        assertion = '\n    const { id } = params as { id: number };'
    elif 'CreateCommentRequest' in original_type:
        assertion = '\n    const typedParams = params as CreateCommentRequest;'
    elif 'CommentQueryParams' in original_type:
        assertion = '\n    const typedParams = params as CommentQueryParams;'
    elif 'UploadMediaRequest & { file_path: string }' in original_type:
        assertion = '\n    const typedParams = params as UploadMediaRequest & { file_path: string };'
    elif 'UpdateMediaRequest & { id: number }' in original_type:
        assertion = '\n    const typedParams = params as UpdateMediaRequest & { id: number };'
    else:
        # Generic fallback
        assertion = f'\n    const typedParams = params as {original_type.strip()};'
    
    if r'\2' in pattern and content:
        replacement = rf'\1{assertion}\2'
        return re.sub(pattern, replacement, content, flags=re.MULTILINE)
    else:
        replacement = rf'\1{assertion}\n    try {{'
        return re.sub(pattern + r'(\n\s*try \{)?', replacement, content, flags=re.MULTILINE)

def fix_parameter_references(content, method_name):
    """Fix parameter references in method body"""
    
    # Replace common parameter patterns
    fixes = [
        # params.id -> id
        (r'params\.id\b', 'id'),
        # params.force -> force  
        (r'params\.force\b', 'force'),
        # client.someMethod(params) -> client.someMethod(typedParams)
        (r'client\.\w+\(params\)', lambda m: m.group(0).replace('params', 'typedParams')),
    ]
    
    for pattern, replacement in fixes:
        if callable(replacement):
            content = re.sub(pattern, replacement, content)
        else:
            content = re.sub(pattern, replacement, content)
    
    return content

def main():
    """Fix handler signatures in all tool files"""
    
    tools_dir = Path('/Users/thomas/Programming/mcp-wordpress/src/tools')
    
    for file_path in tools_dir.glob('*.ts'):
        print(f"Processing {file_path.name}...")
        
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # Find all handler methods that need fixing
        handler_pattern = r'public async (handle\w+)\(\s*client: WordPressClient,\s*params: ([^)]+)\): Promise<unknown>'
        
        matches = re.findall(handler_pattern, content, re.MULTILINE)
        
        for method_name, param_type in matches:
            if 'Record<string, unknown>' not in param_type:
                print(f"  Fixing {method_name} with params: {param_type}")
                
                # Fix the signature
                content = fix_handler_signature(content, method_name)
                
                # Add type assertion (simplified approach)
                # We'll manually fix the most common patterns
                
                # Fix parameter references
                content = fix_parameter_references(content, method_name)
        
        # Only write if changed
        if content != original_content:
            with open(file_path, 'w') as f:
                f.write(content)
            print(f"  Updated {file_path.name}")

if __name__ == '__main__':
    main()