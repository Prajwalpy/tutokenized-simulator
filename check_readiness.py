#!/usr/bin/env python3
"""
Front-end and Back-end Readiness Checker
Verifies that all components are ready for SOL VM integration
"""

import os
import sys
import json
import subprocess
from pathlib import Path

class ReadinessChecker:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.errors = []
        self.warnings = []
        
    def check_frontend_files(self):
        """Check if all required front-end files exist"""
        print("🔍 Checking front-end files...")
        
        required_files = [
            'src/utils/hybridExecutor.ts',
            'src/utils/executorManager.ts',
            'src/components/ExecutorSettings.tsx',
            'src/components/CodeEditor.tsx',
            'package.json'
        ]
        
        for file_path in required_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                print(f"  ✅ {file_path}")
            else:
                self.errors.append(f"Missing file: {file_path}")
                print(f"  ❌ {file_path}")
    
    def check_backend_files(self):
        """Check if all required back-end files exist"""
        print("\n🔍 Checking back-end files...")
        
        required_files = [
            'message_queue_api.py',
            'sol_vm_python_poller.py',
            'requirements.txt',
            'deploy_sol_vm.sh',
            'deploy_queue.sh'
        ]
        
        for file_path in required_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                print(f"  ✅ {file_path}")
            else:
                self.errors.append(f"Missing file: {file_path}")
                print(f"  ❌ {file_path}")
    
    def check_package_dependencies(self):
        """Check if package.json has required dependencies"""
        print("\n🔍 Checking package dependencies...")
        
        package_json_path = self.project_root / 'package.json'
        if not package_json_path.exists():
            self.errors.append("package.json not found")
            return
        
        try:
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
            
            dependencies = package_data.get('dependencies', {})
            
            required_deps = [
                '@radix-ui/react-switch',
                '@radix-ui/react-tabs',
                '@radix-ui/react-badge',
                '@radix-ui/react-dialog'
            ]
            
            for dep in required_deps:
                if dep in dependencies:
                    print(f"  ✅ {dep}")
                else:
                    self.warnings.append(f"Dependency might be missing: {dep}")
                    print(f"  ⚠️  {dep}")
            
        except json.JSONDecodeError:
            self.errors.append("Invalid package.json format")
    
    def check_environment_config(self):
        """Check environment configuration"""
        print("\n🔍 Checking environment configuration...")
        
        env_example = self.project_root / '.env.example'
        env_local = self.project_root / '.env.local'
        
        if env_example.exists():
            print("  ✅ .env.example exists")
        else:
            self.warnings.append(".env.example not found")
            print("  ⚠️  .env.example")
        
        if env_local.exists():
            print("  ✅ .env.local exists")
            
            # Check if it has the required variables
            with open(env_local, 'r') as f:
                env_content = f.read()
            
            required_vars = [
                'REACT_APP_TASK_QUEUE_URL',
                'REACT_APP_RESULT_QUEUE_URL',
                'REACT_APP_API_KEY'
            ]
            
            for var in required_vars:
                if var in env_content:
                    print(f"    ✅ {var}")
                else:
                    self.warnings.append(f"Environment variable {var} not set")
                    print(f"    ⚠️  {var}")
        else:
            self.warnings.append(".env.local not found - create from .env.example")
            print("  ⚠️  .env.local")
    
    def check_python_requirements(self):
        """Check Python requirements for back-end"""
        print("\n🔍 Checking Python requirements...")
        
        try:
            # Check if Python 3 is available
            result = subprocess.run(['python3', '--version'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                print(f"  ✅ Python: {result.stdout.strip()}")
            else:
                self.errors.append("Python 3 not found")
                print("  ❌ Python 3")
        except FileNotFoundError:
            self.errors.append("Python 3 not found")
            print("  ❌ Python 3")
        
        # Check requirements.txt
        req_file = self.project_root / 'requirements.txt'
        if req_file.exists():
            print("  ✅ requirements.txt exists")
            
            with open(req_file, 'r') as f:
                requirements = f.read()
            
            required_packages = ['requests', 'psutil', 'flask', 'flask-cors']
            for package in required_packages:
                if package in requirements:
                    print(f"    ✅ {package}")
                else:
                    self.warnings.append(f"Python package {package} not in requirements")
                    print(f"    ⚠️  {package}")
        else:
            self.errors.append("requirements.txt not found")
            print("  ❌ requirements.txt")
    
    def check_documentation(self):
        """Check if documentation exists"""
        print("\n🔍 Checking documentation...")
        
        docs = [
            'SOL_VM_COMMUNICATION_GUIDE.md',
            'QUEUE_DEPLOYMENT_GUIDE.md',
            'README.md'
        ]
        
        for doc in docs:
            doc_path = self.project_root / doc
            if doc_path.exists():
                print(f"  ✅ {doc}")
            else:
                self.warnings.append(f"Documentation missing: {doc}")
                print(f"  ⚠️  {doc}")
    
    def generate_setup_summary(self):
        """Generate setup summary and next steps"""
        print("\n" + "="*60)
        print("📋 SETUP SUMMARY")
        print("="*60)
        
        if not self.errors:
            print("✅ All critical components are ready!")
        else:
            print("❌ Critical issues found:")
            for error in self.errors:
                print(f"   • {error}")
        
        if self.warnings:
            print("\n⚠️  Warnings (recommended to fix):")
            for warning in self.warnings:
                print(f"   • {warning}")
        
        print("\n📖 NEXT STEPS:")
        print("="*60)
        
        if self.errors:
            print("1. ❌ Fix the critical errors listed above")
            print("2. 🔄 Run this checker again")
        else:
            print("1. 🚀 Deploy the message queue API:")
            print("   ./deploy_queue.sh")
            print()
            print("2. 📝 Update .env.local with your deployed API URLs:")
            print("   REACT_APP_TASK_QUEUE_URL=https://your-app.herokuapp.com/tasks")
            print("   REACT_APP_RESULT_QUEUE_URL=https://your-app.herokuapp.com/results")
            print("   REACT_APP_API_KEY=your-generated-api-key")
            print()
            print("3. 🖥️  Set up SOL VM poller:")
            print("   scp sol_vm_python_poller.py deploy_sol_vm.sh user@sol-vm-ip:/home/user/")
            print("   ssh user@sol-vm-ip")
            print("   ./deploy_sol_vm.sh")
            print()
            print("4. ▶️  Start your front-end:")
            print("   npm run dev")
            print()
            print("5. 🧪 Test the integration using the Settings tab in your app")
        
        print("\n📚 For detailed instructions, see:")
        print("   • SOL_VM_COMMUNICATION_GUIDE.md")
        print("   • QUEUE_DEPLOYMENT_GUIDE.md")
    
    def run_all_checks(self):
        """Run all readiness checks"""
        print("🔍 SOL VM Integration Readiness Check")
        print("="*60)
        
        self.check_frontend_files()
        self.check_backend_files()
        self.check_package_dependencies()
        self.check_environment_config()
        self.check_python_requirements()
        self.check_documentation()
        
        self.generate_setup_summary()
        
        return len(self.errors) == 0

def main():
    checker = ReadinessChecker()
    success = checker.run_all_checks()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
