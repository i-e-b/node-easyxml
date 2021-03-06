var et = require('elementtree'),
    inflect = require('inflect'),
    ElementTree = et.ElementTree,
    element = et.Element,
    subElement = et.SubElement;

/**
 * This function merges two objects. Pretty simple stuff.
 */
function merge(obj1, obj2)
{
    var obj3 = {};
    for (var attr1 in obj1)
    {
        obj3[attr1] = obj1[attr1];
    }
    for (var attr2 in obj2)
    {
        obj3[attr2] = obj2[attr2];
    }
    return obj3;
}

/**
 * This function pads a number so that it is two digits
 */
function zeroPadTen(val)
{
    if (val < 10)
    {
        return "0" + val;
    }
    return val;
}

/**
 * This is our main EasyXml object which gets exported as a module
 */
var EasyXml = function ()
{
    var self = this;

    /**
     * Default configuration object
     */
    self.config = {
        singularizeChildren: true,
        underscoreAttributes: true,
        underscoreChar: '_',
        rootElement: 'response',
        dateFormat: 'ISO', // ISO = ISO8601, SQL = MySQL Timestamp, JS = (new Date).toString()
        manifest: false,
        unwrappedArrays: false,
        schema: null,
        indent: 4,
        bareItemContainer : "Item"
    };

    /**
     * Public
     * Merges in the provided config object with the defaults
     */
    self.configure = function (config)
    {
        // should be merge, otherwise we lose defaults
        self.config = merge(self.config, config);
    };

    /**
     * Public
     * Takes an object and returns an XML string
     */
    self.render = function (object, objectType, rootElementOverride)
    {
        var xml = element(rootElementOverride || self.config.rootElement);

        if (isEnumerable(object)) {
            parseChildElement(xml, object, objectType);
        } else if (object != null && object != undefined) {
            xml.text = ''+object;
        }

        return new ElementTree(xml).write({
            xml_declaration: self.config.manifest,
            indent: self.config.indent
        });
    };

    function isEnumerable(value) {
      var type = typeof value;
      return !!value && (type == 'object' || type == 'function') && (type != 'string');
    }

    /**
     * Recursive, Private
     * Takes an object and calls appropriate function to generate xml node in document
     */
    function parseChildElement(parentXmlNode, parentObjectNode, objectType)
    {
        var remainingKeys;
        if (isEnumerable(parentObjectNode)) {
            remainingKeys = Object.keys(parentObjectNode);
        } else {
            remainingKeys = [];
        }

        var processRemainingElements = true;
        var includedCount = 0;
        var validAttributes = undefined;
        if (self.config.schema && objectType) {
            var schema = self.config.schema[objectType];
            if (schema) {
                validAttributes = schema['ValidAttributes'];
                if (schema['IncludeNamedElementsOnly']) {
                    processRemainingElements = false;
                }
                var elementInfo, elementNumber = 0;
                while (elementInfo = schema[elementNumber++]) {
                    if (parentObjectNode[elementInfo.ElementName] != undefined) includedCount++;
                    processChildElement(elementInfo.ElementName, parentXmlNode, parentObjectNode, elementInfo.Type, validAttributes);

                    // remove from unordered list and advance to next element in schema
                    delete remainingKeys[remainingKeys.indexOf(elementInfo.ElementName)];
                }
            }
        }

        // Process any remaining properties in object key order
        // Skipped if schema states known objects only.
        // If schema didn't match any supplied elements, we output everything.
        // Attributes are always added regardless of schema
        remainingKeys.forEach(function (key) {
            if (isAttribute(key) || processRemainingElements || includedCount < 1) {
                processChildElement(key, parentXmlNode, parentObjectNode, objectType, validAttributes);
            }
        });
    }

    /**
     * Private
     * Tests whether a key should be treated as an attribute or not
     * @param {string} key The name of the key
     * @returns {boolean} true if the key is to be treated as an attribute
     */
    function isAttribute(key)
    {
        return (self.config.underscoreAttributes && key.charAt(0) === self.config.underscoreChar);
    }

    /**
     * Recursive, Private
     * Takes an object and attaches it to the XML doc
     */
    function processChildElement(key, parentXmlNode, parentObjectNode, objectType, validAttributes)
    {
        if (!parentObjectNode.hasOwnProperty(key)){
            return;
        }

        // Helper function to set an attribute. Only set if validAttributes has not been defined or key is in validAttributes
        var setAttribute = function(attrKey, child)
        {
            if (!validAttributes || validAttributes.indexOf(attrKey) >= 0) {
                parentXmlNode.set(attrKey, child);
            }
        };

        var child = parentObjectNode[key];
        var el = null;

        if (!isNaN(key)) {
        	key = self.config.bareItemContainer;
        }
        if (!isAttribute(key)) {
            el = subElement(parentXmlNode, key);
        }

        if ((!self.config.singularizeChildren && !self.config.unwrappedArrays) && typeof parentXmlNode === 'object' && typeof child === 'object') {
            for (var innerKey in child) {
                if (typeof child[innerKey] === 'object') {
                    parseChildElement(el, child[innerKey], objectType);
                } else {
                    el = subElement(el, innerKey);
                    el.text = child[innerKey].toString();
                }
            }
        } else if (isAttribute(key)) {
            if (typeof child === 'string' || typeof child === 'number' || typeof child === 'boolean' || typeof child === 'date') {
                if (key === self.config.underscoreChar)
                    parentXmlNode.text = child;
                else
                    setAttribute(key.substring(1), child);
            } else {
                if(child){
                    Object.keys(child).forEach(function (childKey){
                        setAttribute(childKey, child[childKey]);
                    });
                }
            }
        } else if (child === null)
        {
            el.text = ""
        } else if (typeof child === 'object' && child.constructor && child.constructor.name && child.constructor.name === 'Date')
        {
            // Date
            if (self.config.dateFormat === 'ISO')
            {
                // ISO: YYYY-MM-DDTHH:MM:SS.mmmZ
                el.text = child.toISOString();
            } else if (self.config.dateFormat === 'SQL')
            {
                // SQL: YYYY-MM-DD HH:MM:SS
                var yyyy = child.getFullYear();
                var mm = zeroPadTen(child.getMonth() + 1);
                var dd = zeroPadTen(child.getDate());
                var hh = zeroPadTen(child.getHours());
                var min = zeroPadTen(child.getMinutes());
                var ss = zeroPadTen(child.getSeconds());

                el.text = [yyyy, '-', mm, '-', dd, ' ', hh, ':', min, ':', ss].join("");
            } else if (self.config.dateFormat === 'JS') {
                // JavaScript date format
                el.text = child.toString();
            } else {
                throw new Error(key + "contained unknown_date_format");
            }
        } else if (typeof child === 'object' && child.constructor && child.constructor.name && child.constructor.name === 'Array') {
            // Array
            var subElementName = self.config.unwrappedArrays && !self.config.singularizeChildren ? key : inflect.singularize(key);

            for (var key2 in child) {
                // if unwrapped arrays, make new subelements on the parent.
                var el2 = (self.config.unwrappedArrays === true) ? (subElement(parentXmlNode, subElementName)) : (subElement(el, subElementName));
                // Check type of child element
                if (child.hasOwnProperty(key2) && typeof child[key2] === 'object') {
                    parseChildElement(el2, child[key2], objectType);
                } else {
                    // Just add element directly without parsing
                    el2.text = child[key2].toString();
                }
            }
            // if unwrapped arrays, the initial child element has been consumed:
            if (self.config.unwrappedArrays === true)
            {
                parentXmlNode.delItem(parentXmlNode._children.indexOf(el));
                el = undefined;
            }
        } else if (typeof child === 'object') {
            // Object, go deeper
            parseChildElement(el, child, objectType);
        } else if (typeof child === 'number' || typeof child === 'boolean') {
            el.text = child.toString();
        } else if (typeof child === 'string') {
            el.text = child;
        } else if (typeof child === 'undefined') {
            parentXmlNode.delItem(parentXmlNode._children.indexOf(el));
        } else {
            throw new Error(key + " contained unknown_data_type: " + typeof child);
        }
    }
};

module.exports = new EasyXml();
