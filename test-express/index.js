require('dotenv').config();
const { initCollections, models } = require("../src/collections");
const express = require('express');
const cors = require('cors');

const appName = process.env.APP_NAME;
const dbName = process.env.DBNAME;
const dbUser = process.env.DBUSER;
const dbPassword = process.env.DBPASSWORD;
const groupId = process.env.GROUP_ID;
const websiteName = process.env.WEBSITE_NAME;
const port = process.env.PORT;
const baseRoute = process.env.BASE_ROUTE;

let app = express();
app.use(cors());
app.options('*', cors());
app.use(express.json({ limit: "50mb" }));

app.get(baseRoute + '/test', function (req, res) {
    res.json(
        {message: "App Tested Successfully"}
    );
});

app.get(baseRoute + '/testdb', async function (req, res) {
    let collections = await models.instance.collection.findAll();
    res.json(
        {message: "App DB Tested Successfully", collections}
    );
});

initCollections(dbName, dbUser, dbPassword, groupId).then(() => {
    app.listen(process.env.PORT, () => {
        console.log(`${appName} app of ${websiteName} is running on port ${port} successfully`);
    });
}).catch(err => {
    // Deal with the fact the chain failed
    console.log(`${appName} app of ${websiteName} error: Can't init collections of website`);
    console.log(err);
    throw new Error(`${appName} app of ${websiteName} error: Can't init collections of website`)
});

