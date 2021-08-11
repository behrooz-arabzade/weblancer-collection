let Sequelize = require('sequelize');
const {DataTypes} = Sequelize;

let type;

module.exports.define = function define(Sequelize) {
    class FILE extends DataTypes.ABSTRACT {
        toSql() {
            return 'JSONB';
        }

        // Optional, validator function
        // {
        //     urlPath: "1/2/3/asdd/asdasd.png",
        //     extension: "png",
        //     name: "asdasd.png",
        //     type: "image"
        // }
        validate(value, options) {
            if (typeof value === 'object') {
                return (value.urlPath);
            }

            return false;
        }

        _sanitize(value) {
            // Force all numbers to be positive
            if (typeof value === "string") {
                try {
                    value = JSON.parse(value);
                } catch {
                    value = {
                        url: value
                    }
                }
            }
            if (!value.type) {
                value.type = value.urlPath.split('.').pop();
            }
            if (!value.name) {
                value.name = value.urlPath.substr(value.urlPath.lastIndexOf("/") + 1);
            }
            if (!value.type) {
                value.type = "other";
            }

            return value;
        }

        _stringify(value) {
            return JSON.stringify(value);
        }

        static parse(value) {
            return JSON.parse(value);
        }
    }

    DataTypes.FILE = FILE;

    DataTypes.FILE.prototype.key = DataTypes.FILE.key = 'FILE'

    Sequelize.FILE = Sequelize.Utils.classToInvokable(DataTypes.FILE);

    type = DataTypes.FILE;
}

module.exports.FILE = type;
