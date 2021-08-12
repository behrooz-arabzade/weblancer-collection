const { ARRAY } = require("./Array");
const { BOOLEAN } = require("./Boolean");
const { DATETIME } = require("./DateTime");
const { FILE } = require("./File");
const { FILEGALLERY } = require("./FileGallery");
const { NUMBER } = require("./Number");
const { OBJECT } = require("./Object");
const { TAGS } = require("./Tags");
const { TEXT } = require("./Text");
const { TIME } = require("./Time");

module.exports = function getDataType(weblancerType) {
    console.log("getDataType weblancerType ", weblancerType)
    switch (weblancerType) {
        case "text":
            return TEXT;
        case "image":
            return FILE;
        case "boolean":
            return BOOLEAN;
        case "number":
            console.log("getDataType return number", NUMBER)
            return NUMBER;
        case "datetime":
            return DATETIME;
        case "time":
            return TIME;
        case "richtext":
            return TEXT;
        case "url":
            return TEXT;
        case "document":
            return FILE;
        case "video":
            return FILE;
        case "audio":
            return FILE;
        case "address":
            return TEXT;
        case "tags":
            return TAGS;
        case "array":
            return ARRAY;
        case "object":
            return OBJECT;
        case "mediagallery":
            return FILEGALLERY;
    }
};
