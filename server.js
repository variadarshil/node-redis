const express = require('express');
const axios = require('axios');
const redis = require("redis");

const app = express();

const port = process.env.PORT || 3000;

let redisClient;

(async () => {
    redisClient = redis.createClient();

    redisClient.on('error', (error) => console.log(`Error: ${error}`));
    await redisClient.connect();
})();

async function fetchApi(species) {
    const fishData = await axios.get(`https://www.fishwatch.gov/api/species/${species}`);
    console.log("Request sent to the API");
    return fishData.data;
}

async function getSpeciesData(req, res) {
    const species = req.params.species;
    let results;
    let isCached = false;

    try {
        const cachedRes = await redisClient.get(species)
        if (cachedRes) {
            isCached = true;
            results = JSON.parse(cachedRes);
            return;
        } 
        results = await fetchApi(species);
        if (results.length === 0) {
            throw 'API returned empty array';
        }
        await redisClient.set(species, JSON.stringify(results), {
            EX: 180
        });
        res.send({
            fromCache: isCached,
            data: results
        })
    } catch(err) {
        console.error(error);
        res.status(404).send('Data unavailable');
    }
}

app.get("/fish/:species", getSpeciesData);

app.listen(port, () => {
    console.log(`listening on ${port}`)
});