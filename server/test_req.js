fetch("http://localhost:3000/api/sync/changes?since=1970-01-01 00:00:00").then(r => r.json()).then(d => {
    console.log("Total changes:", d.changes?.length);
    console.log("Has songs?", d.changes?.some(c => c.table_name === 'songs'));
    const song = d.changes?.find(c => c.table_name === 'songs');
    if (song) {
        const data = JSON.parse(song.data);
        console.log("Song has sections?", !!data.sections, "Array length:", data.sections?.length);
    }
    console.log("Server time:", d.serverTime);
}).catch(console.error);
