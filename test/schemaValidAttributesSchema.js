module.exports = {
    "schemaRoot" : {
        "0" : {
            "ElementName" : "allAttributes",
            "Type" : "allRoot"
        },
        "1" : {
            "ElementName" : "limitedAttributes",
            "Type" : "limitedRoot"
        }
    },

    "allRoot" : {
        // All attributes should appear in output
        "0" : {
            "ElementName" : "many",
            "Type" : null // specifically no schema for sub-type
        }
    },

    "limitedRoot" : {
        // Only the following attributes will appear in output
        "ValidAttributes": [
            "id", "name", "path"
        ],
        "0" : {
            "ElementName" : "many",
            "Type" : null // specifically no schema for sub-type
        }
    }

}
