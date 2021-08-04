let ARRAY = require("./datatypes/Array");
let BOOLEAN = require("./datatypes/Boolean");
let DATETIME = require("./datatypes/DateTime");
let FILE = require("./datatypes/File");
let FILEGALLERY = require("./datatypes/FileGallery");
let NUMBER = require("./datatypes/Number");
let OBJECT = require("./datatypes/Object");
let TAGS = require("./datatypes/Tags");
let TEXT = require("./datatypes/Text");
let TIME = require("./datatypes/Time");

let collectionManager = {};

collectionManager.addWeblancerDataTypes = (Sequelize) => {
    ARRAY.define(Sequelize);
    BOOLEAN.define(Sequelize);
    DATETIME.define(Sequelize);
    FILE.define(Sequelize);
    FILEGALLERY.define(Sequelize);
    NUMBER.define(Sequelize);
    OBJECT.define(Sequelize);
    TAGS.define(Sequelize);
    TEXT.define(Sequelize);
    TIME.define(Sequelize);
}

module.exports = collectionManager;