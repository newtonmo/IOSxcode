NovaMed Supabase bucket fix

Your Supabase structure is:
- Bucket: novamed
- Video folder/prefix: focus video
- File/PDF folder/prefix: novamed-files

In NovaMed Cloud Setup, enter exactly:
- Storage bucket: novamed
- Video folder: focus video
- File/PDF folder: novamed-files

This build prevents folder names from being treated as bucket names.
If the browser cached an older setup, open Cloud Setup and press Save cloud setup once after entering the correct values.
