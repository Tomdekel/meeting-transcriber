"""
Vercel build script to generate Prisma client.
This runs during Vercel's Python build process.
"""
import subprocess
import sys
import os

def main():
    print("=" * 50)
    print("Running Vercel build script...")
    print("=" * 50)

    # Get the schema path
    schema_path = os.path.join(os.path.dirname(__file__), "../shared/prisma/schema.prisma")
    schema_path = os.path.abspath(schema_path)

    print(f"Schema path: {schema_path}")
    print(f"Schema exists: {os.path.exists(schema_path)}")

    # Generate Prisma client
    try:
        print("\nGenerating Prisma client...")
        result = subprocess.run(
            ["prisma", "py", "generate", f"--schema={schema_path}"],
            capture_output=True,
            text=True,
            check=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        print("✓ Prisma client generated successfully!")
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to generate Prisma client:")
        print(e.stdout)
        print(e.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        sys.exit(1)

    print("=" * 50)
    print("Build complete!")
    print("=" * 50)

if __name__ == "__main__":
    main()
