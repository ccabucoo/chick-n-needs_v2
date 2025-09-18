// PM2 Ecosystem configuration for Chick'N Needs server
module.exports = {
  apps: [{
    name: 'chicknneeds-api',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      HOST: '0.0.0.0'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000,
      HOST: '0.0.0.0'
    },
    error_file: '/var/log/pm2/chicknneeds-error.log',
    out_file: '/var/log/pm2/chicknneeds-out.log',
    log_file: '/var/log/pm2/chicknneeds-combined.log',
    time: true
  }]
};
