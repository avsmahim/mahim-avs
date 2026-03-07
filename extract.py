import os

os.makedirs('css', exist_ok=True)
os.makedirs('js', exist_ok=True)

with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extract CSS (lines 14 to 791 in the 1-indexed file -> index 13 to 791)
with open('css/style.css', 'w', encoding='utf-8') as f:
    f.writelines(lines[13:791])

# Extract supabase-client (lines 974 to 991 -> index 973 to 991)
with open('js/supabase-client.js', 'w', encoding='utf-8') as f:
    f.writelines(lines[973:991])

# Extract main.js (lines 994 to 1210 -> index 993 to 1210)
with open('js/main.js', 'w', encoding='utf-8') as f:
    f.writelines(lines[993:1210])

# Extract auth.js (lines 1218 to 1493 -> index 1217 to 1493)
with open('js/auth.js', 'w', encoding='utf-8') as f:
    f.writelines(lines[1217:1493])

# Build new index.html
new_index = lines[:13] + ["  <link rel=\"stylesheet\" href=\"css/style.css\">\n"] + lines[791:973] + [
    "  <script src=\"js/supabase-client.js\"></script>\n",
    "  <script src=\"js/main.js\"></script>\n",
    "  <script src=\"js/auth.js\"></script>\n"
] + lines[1493:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.writelines(new_index)

print("Extraction complete.")
