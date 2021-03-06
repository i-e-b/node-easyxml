module.exports = {
    "schemaRoot" : {
        "IncludeNamedElementsOnly": true, // Only "single" and "deeper" should appear at this level
        "0" : {
            "ElementName" : "single",
            "Type" : "sz" // testing where there is no matching type in the schema
        },
        "1" : {
            "ElementName" : "deeper",
            "Type" : "deepRoot" // will pass to next level in the schema
        }
    },

    "deepRoot" : {
        "IncludeNamedElementsOnly": true,
        "0" : {
            "ElementName" : "many",
            "Type" : null // specifically no schema fo sub-type
        }
        // the other elements are not specified, and should not appear because "IncludeNamedElementsOnly" is set
        // but attributes and attribute objects should be output
    }

}
