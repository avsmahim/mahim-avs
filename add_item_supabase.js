const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wyedxqfotzsdxanucvww.supabase.co',
    'sb_publishable_wf_n8NWchrTiB7wqMJU8HA_TIUzAIFb'
);

(async () => {
    try {
        console.log("Inserting item into Supabase...");

        // Based on admin.js item fields
        const { data, error } = await supabase
            .from('items')
            .insert([{
                title: '🎵 Free SFX Pack Vol.1',
                category: 'sfx',
                type: 'free',
                price: 0,
                file_url: '#',
                thumbnail_url: '',
                size: '',
                version: ''
            }])
            .select();

        if (error) {
            console.error("Supabase Insert Error:", error.message);
        } else {
            console.log("Success! Inserted row:", data);
        }
    } catch (err) {
        console.error("Execution Error:", err.message);
    }
})();
