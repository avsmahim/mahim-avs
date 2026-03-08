const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    try {
        console.log("Navigating to Admin Panel...");
        await page.goto('http://localhost:8080/admin.html', { waitUntil: 'networkidle0' });

        console.log("Logging in...");
        await page.type('#admin-password', 'admin123');
        await page.click('button[onclick="loginAdmin()"]');

        // Wait for auth to complete and tabs to show
        await page.waitForSelector('#items-panel', { visible: true, timeout: 5000 });

        console.log("Adding new item...");
        await page.click('#add-item-btn');

        await page.waitForSelector('#item-modal', { visible: true });

        await page.type('#item-title', '🎵 Free SFX Pack Vol.1');
        await page.select('#item-category', 'sfx');
        await page.select('#item-type', 'free');
        await page.type('#item-desc', 'Premium collection of 50+ sound effects for video editors. Includes whoosh, impact, cinematic and transition sounds. Perfect for YouTube, Reels and TikTok videos. 🎵 Download instantly — 100% Free!');
        await page.type('#item-price', '0');

        console.log("Saving item...");

        // Set up dialog listener to accept alerts if any
        page.on('dialog', async dialog => {
            console.log('Dialog message:', dialog.message());
            await dialog.accept();
        });

        await page.click('#item-form button[type="submit"]');

        // Wait a brief moment to allow Supabase insert to complete
        await new Promise(r => setTimeout(r, 2000));

        console.log("Item added successfully.");

    } catch (error) {
        console.error("Error occurred:", error);
    } finally {
        await browser.close();
    }
})();
