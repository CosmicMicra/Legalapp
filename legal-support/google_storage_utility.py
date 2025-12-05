'''
This file contains utilities to upload and download files from a google bucket
'''
# import packages
from google.cloud import storage
import os

# set key credentials file path
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join("keys", "big-data-trial-0892438f38f4.json")

# define function that creates the bucket
def create_bucket(bucket_name, storage_class='STANDARD', location='us-central1'): 
    storage_client = storage.Client()

    bucket = storage_client.bucket(bucket_name)
    bucket.storage_class = storage_class
   
    bucket = storage_client.create_bucket(bucket, location=location) 
    # for dual-location buckets add data_locations=[region_1, region_2]
    
    return f'Bucket {bucket.name} successfully created.'

# define function that uploads a file from the bucket
def upload_cs_file(bucket_name, source_file_name, destination_file_name): 
    storage_client = storage.Client()

    bucket = storage_client.bucket(bucket_name)

    blob = bucket.blob(destination_file_name)
    blob.upload_from_filename(source_file_name)

    return True

def upload_directory_to_cs(bucket_name, source_folder, destination_blob_prefix=""):
    client = storage.Client()
    bucket = client.get_bucket(bucket_name)

    for root, _, files in os.walk(source_folder):
        for file in files:
            local_path = os.path.join(root, file)
            # Construct GCS path
            relative_path = os.path.relpath(local_path, source_folder)
            blob_path = os.path.join(destination_blob_prefix, relative_path).replace("\\", "/")

            blob = bucket.blob(blob_path)
            blob.upload_from_filename(local_path)
            print(f"Uploaded {local_path} to gs://{bucket_name}/{blob_path}")

# define function that list files in the bucket
def list_cs_files(bucket_name): 
    storage_client = storage.Client()

    file_list = storage_client.list_blobs(bucket_name)
    file_list = [file.name for file in file_list]

    return file_list

# define function that downloads a file from the bucket
def download_cs_file(bucket_name, file_name, destination_file_name):
    storage_client = storage.Client()

    bucket = storage_client.bucket(bucket_name)

    blob = bucket.blob(file_name)
    blob.download_to_filename(destination_file_name)

    return True

# delete a file from the bucket
def delete_cs_file(bucket_name, file_name):
    storage_client = storage.Client()

    bucket = storage_client.bucket(bucket_name)

    blob = bucket.blob(file_name)
    blob.delete()

    return True
