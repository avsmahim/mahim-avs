const fs = require('fs');

const files = ['sfx.html', 'plugins.html', 'presets.html', 'apps.html'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Remove header ad slot
    content = content.replace(/<!-- Header Ad Slot -->[\s\S]*?AD BANNER 728x90<\/div>/g, '');

    // Remove inline ad slot
    content = content.replace(/<div class="ad-slot inline-ad"[\s\S]*?AD BANNER 300x250<\/div>/g, '');

    fs.writeFileSync(file, content);
});
console.log('Ad banners removed.');
