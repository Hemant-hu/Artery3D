import os
import shutil

def deploy():
    src = 'models_sota'
    dest = 'models'
    backup = 'models_backup_prev'
    
    if os.path.exists(dest):
        if os.path.exists(backup):
            shutil.rmtree(backup)
        shutil.copytree(dest, backup)
        print(f"[OK] Backed up previous models to '{backup}/'")
        
    for fname in os.listdir(src):
        s_path = os.path.join(src, fname)
        d_path = os.path.join(dest, fname)
        shutil.copy2(s_path, d_path)
        print(f"[DEPLOYED] {fname} -> {dest}/")
        
    print("\n[SUCCESS] SOTA Cardiovascular Models Deployed to Production 'models/'!")

if __name__ == '__main__':
    deploy()
