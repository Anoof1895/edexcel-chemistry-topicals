"""
Runner script to sequentially re-extract Units WCH11, WCH12, WCH14, and WCH15 with --force using cached layouts.
"""
import subprocess
import sys
import time

UNITS = ["WCH11", "WCH12", "WCH14", "WCH15"]

def main():
    start_time = time.time()
    for unit in UNITS:
        print(f"\n{'='*70}", flush=True)
        print(f"STARTING RE-EXTRACTION FOR {unit}", flush=True)
        print(f"{'='*70}\n", flush=True)

        cmd = [sys.executable, "-m", "pipeline.extract", "--unit", unit, "--force"]
        ret = subprocess.run(cmd)
        if ret.returncode != 0:
            print(f"\n[FATAL] Extraction failed for {unit} with exit code {ret.returncode}", flush=True)
            sys.exit(ret.returncode)

        print(f"\n>>> [SUCCESS] Finished extraction for {unit}\n", flush=True)

    elapsed = time.time() - start_time
    print(f"\n{'='*70}", flush=True)
    print(f"ALL 4 UNITS (WCH11, WCH12, WCH14, WCH15) COMPLETED IN {elapsed:.1f}s", flush=True)
    print(f"{'='*70}\n", flush=True)

if __name__ == "__main__":
    main()
