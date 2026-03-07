import os

with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

# We want to remove the hero section `<section class="scroll-sequence" id="home"> ... </section>`
import re

# Remove hero
base_html = re.sub(r'<section class="scroll-sequence" id="home">.*?</section>', '', index_html, flags=re.DOTALL)

# In the sub pages we need to change <h2>PREMIUM RESOURCES</h2> to the category name,
# remove the filter buttons, and set a data-category to the grid.
def create_page(filename, title, category=""):
    html = base_html
    # Update title
    html = html.replace('<title>AVS MAHIM</title>', f'<title>{title} | AVS MAHIM</title>')
    # Update H2
    html = html.replace('<h2>PREMIUM RESOURCES</h2>', f'<h2 style="margin-top: 100px; font-size: 3rem;">{title}</h2>')
    
    # Remove filter tabs
    html = re.sub(r'<div class="filter-tabs">.*?</div>', '', html, flags=re.DOTALL)
    
    # Add data-category to grid and top/bottom ad slots
    ad_slot_html = '<div class="ad-slot inline-ad" style="margin: 40px auto; text-align: center; height: 250px; width: 300px; background: #222; display: flex; align-items: center; justify-content: center; border: 1px dashed #555; color: #555;">AD BANNER 300x250</div>\n'
    
    if category:
        html = html.replace('id="resources-grid">', f'id="resources-grid" data-category="{category}">\n{ad_slot_html}')
    else:
        # For search page
        html = html.replace('id="resources-grid">', f'id="resources-grid" data-search="true">\n{ad_slot_html}')
        # Add Search input instead of filter tabs
        search_html = '<div style="text-align: center; margin-bottom: 3rem;"><input type="text" id="search-input" placeholder="Search all items..." style="padding: 1rem 2rem; width: 100%; max-width: 600px; border-radius: 50px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: white; font-size: 1.2rem; outline: none;"><button id="search-btn" class="btn-yellow" style="margin-left: -50px; padding: 1rem 2rem; margin-bottom: 0;">GO</button></div>'
        html = html.replace(f'<h2 style="margin-top: 100px; font-size: 3rem;">{title}</h2>', f'<h2 style="margin-top: 100px; font-size: 3rem;">{title}</h2>\n{search_html}')

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(html)

create_page('plugins.html', 'PLUGINS', 'plugins')
create_page('sfx.html', 'SFX', 'sfx')
create_page('presets.html', 'PRESETS', 'presets')
create_page('apps.html', 'WINDOWS APPS', 'apps')
create_page('search.html', 'SEARCH ARCHIVE', '')

print("Pages generated.")
