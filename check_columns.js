const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wyedxqfotzsdxanucvww.supabase.co',
    'sb_publishable_wf_n8NWchrTiB7wqMJU8HA_TIUzAIFb'
);

(async () => {
    try {
        const { data, error } = await supabase.from('items').select('video_url').limit(1);
        if (error) {
            console.error("Error Selecting video_url:", error.message);
        } else {
            console.log("video_url exists. Data:", data);
        }
    } catch (err) {
        console.error("Exception:", err);
    }
})();
