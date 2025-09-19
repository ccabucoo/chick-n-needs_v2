module.exports = {
  apps: [{
    name: 'chicknneeds-api',
    script: 'server/src/index.js',
    cwd: '/var/www/chicknneeds',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/var/log/chicknneeds/error.log',
    out_file: '/var/log/chicknneeds/out.log',
    log_file: '/var/log/chicknneeds/combined.log',
    time: true
  }]
};
