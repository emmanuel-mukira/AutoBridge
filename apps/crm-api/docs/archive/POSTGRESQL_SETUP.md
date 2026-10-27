# PostgreSQL 18.1 Configuration Guide

## Overview
This guide shows you where and how to configure PostgreSQL shared buffers and caching settings for optimal performance.

---

## Step 1: Locate Your PostgreSQL Configuration File

### **Find postgresql.conf Location**

```bash
# Method 1: Query PostgreSQL
sudo -u postgres psql -c "SHOW config_file;"

# Method 2: Common locations
# Ubuntu/Debian: /etc/postgresql/18/main/postgresql.conf
# CentOS/RHEL: /var/lib/pgsql/18/data/postgresql.conf
# macOS (Homebrew): /opt/homebrew/var/postgresql@18/postgresql.conf
# macOS (Postgres.app): ~/Library/Application Support/Postgres/var-18/postgresql.conf
```

**Example Output**:
```
                config_file                
-------------------------------------------
 /etc/postgresql/18/main/postgresql.conf
(1 row)
```

---

## Step 2: Edit postgresql.conf

### **Open the Configuration File**

```bash
# Ubuntu/Debian
sudo nano /etc/postgresql/18/main/postgresql.conf

# Or use your preferred editor
sudo vim /etc/postgresql/18/main/postgresql.conf
```

### **Find and Update These Settings**

Search for each setting (use `Ctrl+W` in nano or `/` in vim) and update the values:

```conf
#------------------------------------------------------------------------------
# RESOURCE USAGE (except WAL)
#------------------------------------------------------------------------------

# Memory Configuration
shared_buffers = 2GB              # 25% of total RAM (for 8GB system)
                                  # Adjust based on your RAM:
                                  # 4GB RAM → 1GB
                                  # 8GB RAM → 2GB
                                  # 16GB RAM → 4GB
                                  # 32GB RAM → 8GB

effective_cache_size = 6GB        # 75% of total RAM
                                  # This tells the query planner how much
                                  # memory is available for caching
                                  # 4GB RAM → 3GB
                                  # 8GB RAM → 6GB
                                  # 16GB RAM → 12GB
                                  # 32GB RAM → 24GB

work_mem = 16MB                   # Memory per operation (sort, hash)
                                  # Increase if you have complex queries
                                  # with lots of sorting/grouping

maintenance_work_mem = 512MB      # Memory for VACUUM, CREATE INDEX
                                  # Increase for faster index creation

#------------------------------------------------------------------------------
# QUERY TUNING
#------------------------------------------------------------------------------

random_page_cost = 1.1            # For SSD storage (default is 4.0 for HDD)
                                  # Lower value = planner prefers index scans

effective_io_concurrency = 200    # For SSD storage (default is 1)
                                  # Number of concurrent disk I/O operations

#------------------------------------------------------------------------------
# WRITE-AHEAD LOG
#------------------------------------------------------------------------------

wal_buffers = 16MB                # WAL buffer size
                                  # -1 = auto (1/32 of shared_buffers)

checkpoint_completion_target = 0.9 # Spread checkpoints over time
                                   # Reduces I/O spikes

#------------------------------------------------------------------------------
# CONNECTIONS AND AUTHENTICATION
#------------------------------------------------------------------------------

max_connections = 100             # Maximum concurrent connections
                                  # Adjust based on your application needs
```

---

## Step 3: Save and Restart PostgreSQL

### **Save the File**
- **nano**: Press `Ctrl+X`, then `Y`, then `Enter`
- **vim**: Press `Esc`, type `:wq`, press `Enter`

### **Restart PostgreSQL**

```bash
# Ubuntu/Debian
sudo systemctl restart postgresql

# CentOS/RHEL
sudo systemctl restart postgresql-18

# macOS (Homebrew)
brew services restart postgresql@18

# Check status
sudo systemctl status postgresql
```

---

## Step 4: Verify Configuration

### **Check Applied Settings**

```bash
sudo -u postgres psql
```

```sql
-- Check shared_buffers
SHOW shared_buffers;
-- Expected: 2GB (or your configured value)

-- Check effective_cache_size
SHOW effective_cache_size;
-- Expected: 6GB (or your configured value)

-- Check work_mem
SHOW work_mem;
-- Expected: 16MB

-- Check random_page_cost
SHOW random_page_cost;
-- Expected: 1.1

-- Check all memory settings at once
SELECT name, setting, unit, context 
FROM pg_settings 
WHERE name IN (
  'shared_buffers', 
  'effective_cache_size', 
  'work_mem', 
  'maintenance_work_mem',
  'random_page_cost',
  'effective_io_concurrency'
);

-- Exit
\q
```

---

## Step 5: Monitor Cache Performance

### **Check Cache Hit Ratio**

```sql
-- Connect to your database
sudo -u postgres psql -d crm_system

-- Cache hit ratio (should be > 90%)
SELECT 
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit) as heap_hit,
  round(
    sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100, 
    2
  ) as cache_hit_ratio_percent
FROM pg_statio_user_tables;
```

**Expected Output**:
```
 heap_read | heap_hit | cache_hit_ratio_percent 
-----------+----------+-------------------------
      1234 |   123456 |                   99.01
```

**Interpretation**:
- **> 95%**: Excellent - most data is served from cache
- **90-95%**: Good - acceptable performance
- **< 90%**: Poor - consider increasing `shared_buffers`

---

## Step 6: Monitor Query Performance

### **Enable Query Statistics**

Add to `postgresql.conf`:

```conf
#------------------------------------------------------------------------------
# STATISTICS
#------------------------------------------------------------------------------

shared_preload_libraries = 'pg_stat_statements'  # Add this line

# Then add these settings
pg_stat_statements.max = 10000
pg_stat_statements.track = all
```

**Restart PostgreSQL** after adding this.

### **Create Extension**

```sql
-- Connect to your database
sudo -u postgres psql -d crm_system

-- Create extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Verify
\dx
```

### **View Slow Queries**

```sql
-- Top 10 slowest queries
SELECT 
  query,
  calls,
  round(mean_exec_time::numeric, 2) as avg_time_ms,
  round(total_exec_time::numeric, 2) as total_time_ms
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Queries with most total time
SELECT 
  query,
  calls,
  round(total_exec_time::numeric, 2) as total_time_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Reset statistics
SELECT pg_stat_statements_reset();
```

---

## Recommended Settings by RAM

### **4GB RAM System**
```conf
shared_buffers = 1GB
effective_cache_size = 3GB
work_mem = 8MB
maintenance_work_mem = 256MB
```

### **8GB RAM System** (Recommended for Development)
```conf
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 16MB
maintenance_work_mem = 512MB
```

### **16GB RAM System** (Recommended for Production)
```conf
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 32MB
maintenance_work_mem = 1GB
```

### **32GB+ RAM System** (High-Traffic Production)
```conf
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 64MB
maintenance_work_mem = 2GB
```

---

## Troubleshooting

### **PostgreSQL Won't Start After Changes**

```bash
# Check logs
sudo tail -f /var/log/postgresql/postgresql-18-main.log

# Common issues:
# 1. shared_buffers too large for system
# 2. Syntax error in config file
# 3. Insufficient system memory
```

**Solution**: Revert to previous values and restart:

```bash
# Restore backup
sudo cp /etc/postgresql/18/main/postgresql.conf.bak /etc/postgresql/18/main/postgresql.conf

# Or edit and reduce shared_buffers
sudo nano /etc/postgresql/18/main/postgresql.conf

# Restart
sudo systemctl restart postgresql
```

### **System Memory Limits (Linux)**

If PostgreSQL can't allocate shared memory:

```bash
# Check current limits
sysctl kernel.shmmax
sysctl kernel.shmall

# Set limits (temporary)
sudo sysctl -w kernel.shmmax=8589934592  # 8GB in bytes
sudo sysctl -w kernel.shmall=2097152     # 8GB in pages (4KB each)

# Make permanent (add to /etc/sysctl.conf)
echo "kernel.shmmax=8589934592" | sudo tee -a /etc/sysctl.conf
echo "kernel.shmall=2097152" | sudo tee -a /etc/sysctl.conf
```

---

## Performance Testing

### **Before Optimization**

```bash
# Run a query and measure time
\timing on
SELECT * FROM crm.customers WHERE company_id = 1 AND deleted_at IS NULL;
```

### **After Optimization**

Run the same query and compare execution time. You should see:
- **30-50% faster** queries with proper indexes
- **50-80% faster** repeated queries (cache hit)
- **90%+ cache hit ratio** after warming up

---

## Quick Reference

| Setting | Purpose | Recommended Value |
|---------|---------|-------------------|
| `shared_buffers` | Database cache | 25% of RAM |
| `effective_cache_size` | Query planner hint | 75% of RAM |
| `work_mem` | Per-operation memory | 16-64MB |
| `maintenance_work_mem` | Index/VACUUM memory | 512MB-2GB |
| `random_page_cost` | SSD optimization | 1.1 |
| `effective_io_concurrency` | SSD optimization | 200 |

---

## Next Steps

1. ✅ **Update postgresql.conf** with recommended settings
2. ✅ **Restart PostgreSQL** service
3. ✅ **Verify settings** with SHOW commands
4. ✅ **Run database migration** for indexes
5. ✅ **Monitor cache hit ratio** (aim for >90%)
6. ✅ **Enable pg_stat_statements** for query monitoring
7. ✅ **Test query performance** before/after

**Configuration file location**: `/etc/postgresql/18/main/postgresql.conf` (Ubuntu/Debian)

**Restart command**: `sudo systemctl restart postgresql`
