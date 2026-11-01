#!/bin/bash
echo "Restoring MongoDB data from archive..."
mongorestore --archive=/docker-entrypoint-initdb.d/delivery_db.archive