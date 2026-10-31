#!/bin/bash
echo "Restoring MongoDB data from archive..."
mongorestore --archive=/tmp/delivery_db.archive