<?php
declare(strict_types=1);

$cfg['blowfish_secret'] = getenv('PMA_BLOWFISH_SECRET') ?: 'read-and-voice-change-this-secret-32';
$cfg['TempDir'] = '/tmp';
$cfg['ServerDefault'] = 1;

function env_value(array $names, ?string $fallback = null): ?string
{
    foreach ($names as $name) {
        $value = getenv($name);

        if ($value !== false && $value !== '') {
            return $value;
        }
    }

    return $fallback;
}

function add_mysql_server(
    int $index,
    string $label,
    array $hostNames,
    array $portNames,
    array $userNames,
    array $passwordNames,
    array $databaseNames,
    string $fallbackHost,
    string $fallbackPort
): void {
    global $cfg;

    $host = env_value($hostNames, $fallbackHost);
    $port = env_value($portNames, $fallbackPort);
    $user = env_value($userNames, '');
    $password = env_value($passwordNames, '');
    $database = env_value($databaseNames, '');

    if ($host === '') {
        return;
    }

    $cfg['Servers'][$index]['verbose'] = $label;
    $cfg['Servers'][$index]['host'] = $host;
    $cfg['Servers'][$index]['port'] = $port;
    $cfg['Servers'][$index]['connect_type'] = 'tcp';
    $cfg['Servers'][$index]['auth_type'] = $user !== '' ? 'config' : 'cookie';
    $cfg['Servers'][$index]['compress'] = false;
    $cfg['Servers'][$index]['AllowNoPassword'] = $password === '';

    if ($user !== '') {
        $cfg['Servers'][$index]['user'] = $user;
        $cfg['Servers'][$index]['password'] = $password;
    }

    if ($database !== '') {
        $cfg['Servers'][$index]['only_db'] = $database;
    }

    $sslMode = strtolower((string) env_value(['DB_SSL_MODE', 'MYSQL_SSL_MODE', 'DATABASE_SSL_MODE'], ''));
    $sslEnabled = in_array($sslMode, ['require', 'required', 'verify-ca', 'verify-full'], true)
        || in_array(strtolower((string) env_value(['DB_SSL', 'MYSQL_SSL'], '')), ['1', 'true', 'yes', 'on', 'required'], true);

    if ($sslEnabled) {
        $cfg['Servers'][$index]['ssl'] = true;
        $cfg['Servers'][$index]['ssl_verify'] = in_array($sslMode, ['verify-ca', 'verify-full'], true);

        $caFile = env_value(['DB_SSL_CA_FILE', 'MYSQL_SSL_CA_FILE']);
        if ($caFile !== null && $caFile !== '') {
            $cfg['Servers'][$index]['ssl_ca'] = $caFile;
        }
    }
}

add_mysql_server(
    1,
    'Read and Voice Local MySQL',
    ['LOCAL_DB_HOST'],
    ['LOCAL_DB_PORT'],
    ['LOCAL_DB_USER'],
    ['LOCAL_DB_PASSWORD'],
    ['LOCAL_DB_NAME'],
    'host.docker.internal',
    '3306'
);

add_mysql_server(
    2,
    'Read and Voice Cloud MySQL',
    ['CLOUD_DB_HOST', 'DB_HOST', 'MYSQLHOST', 'MYSQL_HOST'],
    ['CLOUD_DB_PORT', 'DB_PORT', 'MYSQLPORT', 'MYSQL_PORT'],
    ['CLOUD_DB_USER', 'DB_USER', 'MYSQLUSER', 'MYSQL_USER'],
    ['CLOUD_DB_PASSWORD', 'DB_PASSWORD', 'MYSQLPASSWORD', 'MYSQL_PASSWORD'],
    ['CLOUD_DB_NAME', 'DB_NAME', 'MYSQLDATABASE', 'MYSQL_DATABASE'],
    '',
    '3306'
);

$cfg['NavigationTreeEnableGrouping'] = true;
$cfg['ShowPhpInfo'] = false;
