import fetch from 'node-fetch';

async function checkApi() {
    try {
        const response = await fetch('https://kisah5menit.vanila.app/api/stories');
        const stories = await response.json();

        console.log("Status:", response.status);
        if (Array.isArray(stories) && stories.length > 0) {
            console.log("First story image_url:", stories[0].cover.image_url);

            const isCorrect = stories[0].cover.image_url.startsWith('/stories/');
            console.log("URL format correct?", isCorrect);
        } else {
            console.log("No stories found or invalid response");
        }
    } catch (error) {
        console.error("Error fetching API:", error);
    }
}

checkApi();
