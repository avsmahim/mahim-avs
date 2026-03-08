const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wyedxqfotzsdxanucvww.supabase.co',
    'sb_publishable_wf_n8NWchrTiB7wqMJU8HA_TIUzAIFb'
);

(async () => {
    const { data, error } = await supabase.from('items').select('id, title, category, type').limit(20);
    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Items in database:");
        console.table(data);
    }
})();
