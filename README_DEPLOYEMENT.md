### Development:
```
# Terminal 1
cd frontend
npm start

# Terminal 2  
cd BnFChat
python main.py
````
Production:
```
cd BnFChat/frontend
npm run build
cd ..
export FLASK_ENV=production
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5001 wsgi:app
```