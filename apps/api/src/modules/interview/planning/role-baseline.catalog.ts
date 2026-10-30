export interface RequiredRoleBaseline {
    key: string;
    name: string;
    aliases: string[];
    /** Terms that must occur in the actual question/evidence objective. */
    questionAliases: string[];
}

const FRONTEND_BASELINE: RequiredRoleBaseline[] = [
    {
        key: 'javascript-core',
        name: 'JavaScript Core',
        aliases: [
            'javascript',
            'ecmascript',
            'event loop',
            'promise',
            'async await',
            'closure',
            'scope',
            'hoisting',
        ],
        questionAliases: [
            'javascript', 'ecmascript', 'event loop', 'promise', 'async await',
            'callback', 'closure', 'scope', 'hoisting', 'array method', 'map',
            'filter', 'reduce', 'for loop', 'while loop',
        ],
    },
    {
        key: 'html-css-responsive',
        name: 'HTML, CSS và Responsive Design',
        aliases: [
            'html',
            'css',
            'css3',
            'responsive',
            'media query',
            'flexbox',
            'css grid',
        ],
        questionAliases: [
            'html', 'css', 'css3', 'responsive', 'media query', 'flexbox',
            'css grid', 'box model', 'semantic',
        ],
    },
    {
        key: 'react-core',
        name: 'React Core',
        aliases: [
            'react', 'reactjs', 'component', 'props', 'state', 'context',
            'hook', 'useeffect', 'render', 'rerender',
        ],
        questionAliases: [
            'react', 'reactjs', 'component', 'props', 'state', 'context',
            'hook', 'useeffect', 'dependency array', 'render', 'rerender',
        ],
    },
];

const BACKEND_BASELINE: RequiredRoleBaseline[] = [
    {
        key: 'http-api-core',
        name: 'HTTP và API Core',
        aliases: ['http', 'rest api', 'restful', 'status code', 'api design'],
        questionAliases: ['http', 'rest api', 'restful', 'status code', 'api design'],
    },
    {
        key: 'data-persistence-core',
        name: 'Data Persistence Core',
        aliases: ['database', 'sql', 'transaction', 'query', 'persistence'],
        questionAliases: ['database', 'sql', 'transaction', 'query', 'persistence'],
    },
];

export function getRequiredRoleBaselines(
    targetRole: string | undefined,
    interviewType: string,
): RequiredRoleBaseline[] {
    if (
        !['TECHNICAL', 'FULL', 'CODING', 'SYSTEM_DESIGN'].includes(
            interviewType,
        )
    )
        return [];
    const role = (targetRole ?? '')
        .normalize('NFKC')
        .toLocaleLowerCase('en-US');
    if (/front\s*end|frontend|react|vue|angular/.test(role))
        return FRONTEND_BASELINE;
    if (/back\s*end|backend|server|api developer/.test(role))
        return BACKEND_BASELINE;
    return [];
}
