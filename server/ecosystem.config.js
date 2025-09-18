module.exports = {
  apps: [{
    name: 'chicknneeds-api',
    script: 'src/index.js',
    cwd: '/var/www/chicknneeds/chick-n-needs_v2/server',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/var/log/pm2/chicknneeds-api-error.log',
    out_file: '/var/log/pm2/chicknneeds-api-out.log',
    log_file: '/var/log/pm2/chicknneeds-api.log',
    time: true
  }]
};
