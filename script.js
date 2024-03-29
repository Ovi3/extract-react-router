function findReactContainer() {
    const queue = [document.body];
    while (queue.length > 0) {
        const currentNode = queue.shift();

        for (let prop in currentNode) {
            if (prop.indexOf("__reactContainer$") == 0 || prop.indexOf("__reactContainere$") == 0 || prop === "_reactRootContainer") {
                console.log("React container detected on ", prop + " of element ", currentNode);
                return currentNode[prop];
            }
        }

        for (let i = 0; i < currentNode.childNodes.length; i++) {
            queue.push(currentNode.childNodes[i]);
        }
    }

    return null;
}

// <Route> component props: https://github.com/remix-run/react-router/blob/9e7486b89e712b765d947297f228650cdc0c488e/packages/react-router/lib/components.tsx#L378
function isRouteComponent(obj) {
    if (obj !== null && typeof obj === 'object' && 'props' in obj) {
        if (('path' in obj.props && typeof obj.props.path === 'string')) {
            return true;
        } else if ('children' in obj.props && obj.props.children !== null && typeof obj.props.children === 'object') {
            let subs;
            if (Array.isArray(obj.props.children)) {
                subs = obj.props.children;
            } else {
                subs = [obj.props.children];
            }
            for (let sub of subs) {
                if (!isRouteComponent(sub) && !isRouteComponentArray(sub)) {
                    return false;
                }
            }
            return true;
        } else if ('to' in obj.props && typeof obj.props.to === 'string') { // test in the wild, find this case
            return true;
        } else if ('component' in obj.props || 'element' in obj.props || ('render' in obj.props && typeof obj.props.render === 'function')) {
            return true;
        }
    }
    return false;
}

function isRouteComponentArray(obj) {
    if (obj !== null && Array.isArray(obj) && obj.length > 0) {
        for (let route of obj) {
            if (!isRouteComponent(route)) {
                return false;
            }
        }
        return true;
    }
    return false;
}

// check if is <Routes> Component that contains <Route> components
// <Routes> component props: https://github.com/remix-run/react-router/blob/9e7486b89e712b765d947297f228650cdc0c488e/packages/react-router/lib/components.tsx#L492
function isRoutesComponent(obj) {
    if (obj !== null && typeof obj === 'object' && ('props' in obj || 'pendingProps' in obj)) {
        let p = 'props';
        if (!('props' in obj)) {
            p = 'pendingProps'
        }
    
        if (obj[p] != null && typeof obj[p] === 'object' && 'children' in obj[p] && Array.isArray(obj[p].children) && obj[p].children.length > 0) {
            for (let route of obj[p].children) {
                if (route === null) {
                   continue; 
                }
                if (Array.isArray(route) && route.length === 0) {
                    continue;
                }
                if (!isRouteComponent(route) && !isRouteComponentArray(route)) {
                    return false
                }
            }
            return true;
        }
    }
    return false;
}

function pathJoin(part1, part2) {
    if (typeof part2 === 'undefined' || part2 === null) {
        part2 = "";
    }

    prefix = "";
    if (part1 !== null && part1.length > 0) {
        prefix = part1;
    }
    if (prefix.endsWith("*")) {
        prefix = prefix.slice(0, -1);
    }
    if (!prefix.endsWith("/")) {
        prefix = prefix + "/";
    }

    if (part2.startsWith("/")) {
        part2 = part2.slice(1);
    }

    return prefix + part2;
}

function extractRouteInfoes(obj, prefix = "") {
    let infoes = [];
    if ('path' in obj.props && typeof obj.props.path === 'string') {
        infoes.push({ path: pathJoin(prefix, obj.props.path) });
    }
    if ('to' in obj.props && typeof obj.props.to === 'string') {
        infoes.push({ path: pathJoin(prefix, obj.props.to) });
    }
    if ('children' in obj.props && obj.props.children !== null && typeof obj.props.children === 'object') {
        let subs;
        if (Array.isArray(obj.props.children)) {
            subs = obj.props.children;
        } else {
            subs = [obj.props.children]; // only one <Route> component in <Route> componet
        }
        let tmpPrefix = prefix;
        if ('path' in obj.props) {
            tmpPrefix = pathJoin(prefix, obj.props.path);
        }
        for (let sub of subs) {
            if (typeof sub === 'undefined') {
                continue;
            }
            if (!Array.isArray(sub)) {
                infoes.push(...extractRouteInfoes(sub, tmpPrefix));
            } else {
                for (let item of sub) { // sub is an Array of <Route>. why is happening?
                    infoes.push(...extractRouteInfoes(item, tmpPrefix));
                }
            }

        }
    }
    return infoes;
}

function extractRoutesInfoes(obj) {
    let infoes = [];

    let p = 'props';
    if (!('props' in obj)) {
        p = 'pendingProps'
    }

    for (let route of obj[p].children) {
        if (route === null) {
            continue
        }
        if (!Array.isArray(route)) {
            infoes.push(...extractRouteInfoes(route));
        } else {
            for (let item of route) {
                infoes.push(...extractRouteInfoes(item));
            }
        }
        
    }
    return infoes;
}

// RouteOobject: https://github.com/remix-run/react-router/blob/9e7486b89e712b765d947297f228650cdc0c488e/packages/router/utils.ts#L324
function isRouteObject(obj) {
    if (obj !== null && typeof obj === 'object') {
        if ('path' in obj && typeof obj.path === 'string') {
            return true;
        }
        if ('children' in obj && Array.isArray(obj.children)) {
            return true;
        }
    }
    return false;
}

// <RouterProvider> component props: https://github.com/remix-run/react-router/blob/9e7486b89e712b765d947297f228650cdc0c488e/packages/react-router/lib/components.tsx#L60
function isRouterProviderComponent(obj) {
    if (obj !== null && typeof obj === 'object' && ('pendingProps' in obj || 'props' in obj)) {
        let p = 'props';
        if (!('props' in obj)) {
            p = 'pendingProps'
        }

        if (obj[p] !== null && typeof obj[p] === 'object' && 'router' in obj[p]) {
            if (obj[p].router !== null && typeof obj === 'object' && 'routes' in obj[p].router && Array.isArray(obj[p].router.routes)) {
                for (let route of obj[p].router.routes) { // route: https://github.com/remix-run/react-router/blob/00ffa36b0aa5f046239acbc7675c83c43bfb4e2a/packages/router/utils.ts#L308
                    if (!isRouteObject(route)) {
                        return false;
                    }
                }
                return true;
            }
        }
    }
    return false;
}

function extractRouterObjectInfoes(obj, prefix = "") {
    let infoes = [];
    if ('path' in obj) {
        infoes.push({path: pathJoin(prefix, obj.path)})
    }
    if ('children' in obj && Array.isArray(obj.children)) {
        for (let sub of obj.children) {
            infoes.push(...extractRouterObjectInfoes(sub, pathJoin(prefix, obj.path)))
        }
    }
    return infoes;
}

function extractRouterProviderInfoes(obj) {
    let infoes = [];
    let p = 'props';
    if (!('props' in obj)) {
        p = 'pendingProps'
    }
    for (let route of obj[p].router.routes) {
        infoes.push(...extractRouterObjectInfoes(route));
    }
    return infoes;
}

// Breadth-First Search
function findReactRouteInfo(obj, prefix = '', maxDepth = 32) {
    let infoes = [];
    let queue = [{ obj, prefix, depth: 0 }];
    let visited = new WeakSet();

    while (queue.length > 0) {
        let { obj, prefix, depth } = queue.shift();

        if (depth > maxDepth || visited.has(obj)) {
            continue;
        }

        visited.add(obj);

        for (let prop in obj) {
            let newPrefix = prefix.length > 0 ? prefix + "." + prop : prop;

            if (['parent', 'window', 'top', 'self', 'parentNode', 'parentElement', 'ownerDocument', 'ownerElement',
                'previousElementSibling', 'previousSibling', 'offsetParent',
                '_parentVnode', '$parent', '_renderProxy', // vue
                'return', 'containerInfo', '_debugOwner', '_owner', 'alternate' // react
            ].includes(prop)) {
                continue;
            }

            if (/^\d+$/.test(prop)) {
                continue; // avoid to traverse sub routes
            }

            try{
                if (visited.has(obj[prop])) {
                    continue;
                }

                if (isRoutesComponent(obj[prop])) {
                    console.log('found <Routes> component ' + newPrefix);
                    infoes.push(...extractRoutesInfoes(obj[prop]))
    
                    visited.add(obj[prop]);
                } else if (isRouterProviderComponent(obj[prop])) {
                    console.log('found <RouterProvider> component ' + newPrefix);
                    infoes.push(...extractRouterProviderInfoes(obj[prop]))
    
                    visited.add(obj[prop]);
                } else if (typeof obj[prop] === 'object' && obj[prop] !== null) {
                    queue.push({ obj: obj[prop], prefix: newPrefix, depth: depth + 1 });
                }
            } catch (e) {
                // eg: DOMException: Failed to read the 'cssRules' property from 'CSSStyleSheet': Cannot access rules
                // eg: DOMException: Blocked a frame with origin "https://www.xxx.com" from accessing a cross-origin frame.
                if (e instanceof DOMException) {
                    console.warn(e.message, e.stack);
                    continue;
                } else {
                    throw e;
                }
            }

        }
    }

    // unique
    infoes = infoes.filter((item, index) => {
        return infoes.findIndex(obj => obj['path'] === item['path']) === index;
    });

    return infoes;
}

function main() {
    let r = findReactContainer();
    if (r !== null) {
        let infoes = findReactRouteInfo(r);
        return infoes;
    }
    return [];
}

a = main();
console.table(a);




