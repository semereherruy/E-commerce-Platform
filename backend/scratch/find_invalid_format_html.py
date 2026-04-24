import os
import re

def find_invalid_format_html(root_dir):
    # Pattern to find format_html(anything) where anything doesn't contain a comma
    # This might miss some cases with nested parens, but it's a good start.
    pattern = re.compile(r'format_html\s*\(\s*([^,]+?)\s*\)')
    
    for root, dirs, files in os.walk(root_dir):
        if 'venv' in dirs: dirs.remove('venv')
        if '.git' in dirs: dirs.remove('.git')
        
        for file in files:
            if file.endswith('.py'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    matches = pattern.finditer(content)
                    for match in matches:
                        # Exclude calls that are clearly not the error (e.g. format_html(f"...") is still wrong but maybe intended)
                        # Actually, format_html(f"...") is EXACTLY the error if it has no placeholders.
                        print(f"Potential error in {path}: {match.group(0)}")

if __name__ == "__main__":
    find_invalid_format_html('.')
