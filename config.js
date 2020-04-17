export function loadConfig() {
    return {
        userCount: 1, // Virtual Users
        userLoops: 1, // Number of loops per user
        baseUrl: 'https://qa12-mysql.nightly.sakaiproject.org',
        sites: ['MySiteId'], 
        selectedIndex: 0, // Take First 0, Second 1, ... assessment in the list
        rootPasswd: __ENV.ROOT_PWD,
        rootUser: __ENV.ROOT_USR,
        logLevel: 'debug', // none, info, debug
        submitForGrade: true // Do not send the test
    };
}
