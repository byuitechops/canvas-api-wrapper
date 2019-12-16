const promiseLimit = require('promise-limit');
const got = require('got');
const url = require('url');
const util = require('util');
const parse = require('./parse');

const settings = {
    apiToken: process.env.CANVAS_API_TOKEN || '',
    minSendInterval: 10,
    checkStatusInterval: 500,
    subdomain: 'byui',
    rateLimitBuffer: 200,
    get baseUrl() {
        return `https://${this.subdomain}.instructure.com`;
    },
    set baseUrl(val) {
        delete this.baseUrl;
        this.baseUrl = val;
    }
};

// I hate global variables, but somehow I need to save info from call to call
let queue = promiseLimit(30),
    nextSendTime = Date.now(),
    lastOverBuffer = 0,
    rateLimitRemaining = 700;

// The center of the universe
async function canvas(method, path, body, callback) {
    // Fix the parameters
    if (typeof body == 'function') {
        callback = body;
        body = undefined;
    }
    // Callback-y stuff. Ask Ben.
    if (callback) {
        return util.callbackify(canvasGuts)(method, path, body, (err, data)=>{
            if (err)
            {
                return callback(err, null);
            }
            callback(null, data.body);
        });
    }
    var response = await canvasGuts(method, path, body, callback);
    return response.body;
}

async function canvasGuts(method, path, body) {
    // Don't let the queue build up too high
    while (queue.queue > 40) await new Promise(res => setTimeout(res, 500));

    // Check the Api Token
    if (!settings.apiToken) throw new Error('Canvas API Token was not set');


    // Fix the Method
    method = method.toUpperCase();
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
        throw new Error('Method was not get, post, put or delete');
    }

    // Resolving the path
    path = new url.URL(url.resolve(settings.baseUrl, path));

    // Fixing Body if they use weird keys
    if (body) body = parse(body);

    // Append the query parameters
    if (body && method == 'GET') assign(path.searchParams, body);

    var options = {
        url: path.href,
        method: method,
        json: true,
        throwHttpErrors: false,
        headers: {
            Authorization: 'Bearer ' + settings.apiToken,
        }
    };

    // Adding body to options
    if (method != 'GET') options.body = body;


    // Make the request (with the timing checks and stuff)
    let response = await queue(async () => {
        // Make sure our rate limit is not over
        if (rateLimitRemaining < settings.rateLimitBuffer) {
            if (Date.now() - lastOverBuffer > settings.checkStatusInterval) {
                console.warn(`Our rate-limit-remaining (${Number(rateLimitRemaining).toFixed(1)}) is below our buffer (${settings.rateLimitBuffer}), waiting a sec...`);
                lastOverBuffer = Date.now();
            }
            while (rateLimitRemaining < 400) {
                // Display this message if has been at least a second since it was last displayed
                // The waiting a second
                await new Promise(res => setTimeout(res, settings.checkStatusInterval));
                // See what the situation is now
                try {
                    let response = await got.head(url.resolve(settings.baseUrl, '/api/v1/users/self'), {
                        headers: {
                            Authorization: 'Bearer ' + settings.apiToken
                        }
                    });
                    rateLimitRemaining = response.headers['x-rate-limit-remaining'];
                } catch (e) {
                    // We couldn't even make the check
                    console.warn('We\'re in trouble');
                }
                if (rateLimitRemaining === undefined) {
                    throw new Error('There was no x-rate-limit-remaining header');
                }
            }
        }

        // Make sure our calls are staggered at least a little bit, 
        // like 10 milliseconds, so that the first calls doesn't spam the server
        var timeTillSend = nextSendTime - Date.now();
        nextSendTime = Math.max(Date.now(), nextSendTime) + settings.minSendInterval;
        if (timeTillSend > 0) {
            await new Promise(res => setTimeout(res, timeTillSend));
        }

        // log that we are going to make a call
        if (typeof settings.oncall == 'function') {
            settings.oncall({
                method: method.toUpperCase(),
                url: options.url,
                body: body
            });
        }

        // Finally make the actual call
        return got(path.href, options).then(res => {
            if (res.statusCode !== 304 && (res.statusCode < 200 || res.statusCode > 299)) {
                var bodyString = '';
                var details;
                if (body !== undefined) {
                    var title = method === 'get' ? 'Query Object' : 'Request Body'
                    bodyString = util.inspect(body, { depth: null });
                    details += `${title}\n\t${bodyString}`;
                }

                if (typeof res.body === 'object') {
                    resBody = util.inspect(res.body, { depth: null });
                    details += `\n\tResponse Body:\n\t${resBody}`;
                }

                var message = `${method.toUpperCase()} ${path.href} failed with: ${res.statusCode} \n\t${details}`;
                throw new Error(message);
            }
            return res;
        });
    });

    // Update the rateLimitRemaining
    rateLimitRemaining = response.headers['x-rate-limit-remaining'];
    // console.log(Math.floor(this.RateLimitRemaining),Number(response.headers['x-request-cost']).toFixed(3))
    // Turn my links string into a useful object
    let links = parseLink(response.headers.link);
    // Paginate recursively if need to paginate
    //only loop if we are on the first page by checking if they don't have previous page as per documentation
    if (links && links.prev === undefined) {
        let responses = [];
        //go till we don't have a next which means we are on last. There is not always a last set.
        while (links.next !== undefined) {
            let pageResponse = await canvasGuts('GET', links.next);
            responses.push(pageResponse.body);
            links = parseLink(pageResponse.headers.link)
        }
        try {
            // put all the pages together
            if (!Array.isArray(response.body)) {
                if (Object.keys(response.body).length != 1) throw Error();
                var key = Object.keys(response.body)[0];
                response.body = response.body[key];
                responses = responses.map(r => r[key]);
            }
            response.body = response.body.concat(...responses);
        } catch (e) {
            throw new Error('Assumption that paginating body is always an array or has only one property, was wrong');
        }
    }
    return response;
}

// Parses canvas's crazy pagination method
function parseLink(str) {
    if (str) {
        return str.split(',')
            .reduce((obj, link) => {
                // get the link parts
                let [urlBack, rel] = link.split(';');

                //Get just the rel name using capturing groups
                rel = rel.match(/rel="([a-z]+)"/i)[1];
                //Get just the url using capturing groups
                urlBack = urlBack.match(/<(.*)>/)[1];
                obj[rel] = urlBack;
                return obj;
            }, {});
    }
}

// Canvas has a non-standard way of forming nested querystrings, so do it ourself
function assign(params, obj) {
    function recurse(obj, stub = '') {
        for (var key in obj) {
            var entry = stub ? `[${Array.isArray(obj) ? '' : key}]` : key;
            if (typeof obj[key] == 'object') {
                recurse(obj[key], stub + entry);
            } else {
                params.append(stub + entry, obj[key]);
            }
        }
    }
    recurse(obj);
    return params;
}

module.exports = Object.defineProperties(canvas.bind(null, 'GET'), {
    get: {
        get: () => canvas.bind(null, 'GET')
    },
    post: {
        get: () => canvas.bind(null, 'POST')
    },
    put: {
        get: () => canvas.bind(null, 'PUT')
    },
    delete: {
        get: () => canvas.bind(null, 'DELETE')
    },
    apiToken: {
        set: val => settings.apiToken = val
    },
    minSendInterval: {
        set: val => settings.minSendInterval = val
    },
    checkStatusInterval: {
        set: val => settings.checkStatusInterval = val
    },
    oncall: {
        set: val => settings.oncall = val,
        get: () => settings.oncall
    },
    subdomain: {
        set: val => {
            settings.subdomain = val;
        },
        get: () => settings.subdomain
    },
    baseUrl: {
        set: val => {
            if (typeof val != 'string') throw new TypeError('BaseUrl must be a string');
            settings.baseUrl = val;
        },
        get: () => settings.baseUrl
    },
    callLimit: {
        set: val => {
            if (queue.queue == 0) {
                queue = promiseLimit(val);
            } else {
                throw new Error('Can\'t change the queue size while the queue is in operation');
            }
        }
    },
    /* Backwards Compatability */
    domain: {
        set: val => {
            settings.subdomain = val;
        },
        get: () => settings.subdomain
    }
});