import os
import re

def find_invalid_format_html(root_dir):
    pattern = re.compile(r'format_html\s*\(\s*([^,)]+)\s*\)')
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.py'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        matches = pattern.finditer(content)
                        for match in matches:
                            print(f"Found in {path}: {match.group(0)}")
                except Exception as e:
                    pass

if __name__ == "__main__":
    find_invalid_format_html('.')
