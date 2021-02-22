import { generateSnapshotFragment, restoreExternalWindowPositionAndState } from './external-window-snapshot.js';
import { NWIClient } from './nwi-lib.js';

const externalWindowsLaunched = [];
const NWI_SNAPSHOT_PROVIDER = "nwi:snapshot:provider";
let nwiClient = new NWIClient(NWI_SNAPSHOT_PROVIDER); 

 nwiClient.connect().then((client) => { 
    window.nwiClient = nwiClient;
    console.log('Connected');
   });

fin.Platform.init({
    overrideCallback: async (Provider) => {
        class Override extends Provider {
            async getSnapshot() {
                const snapshot = await super.getSnapshot();
                const appInfo = await fin.Application.getCurrentSync().getInfo();
                const nativeApplications = appInfo.manifest.platform.customData.nativeApplications;

                //we add an externalWindows section to our snapshot
                //const externalWindows = await generateSnapshotFragment();
                const nwiFragment = await nwiClient.getSnapshotFragment(nativeApplications);
                return {
                    ...snapshot,
                    nwiFragment
                };
            }

            async applySnapshot({ snapshot, options }) {

                const originalPromise = super.applySnapshot({ snapshot, options });

                //if we have a section with external windows we will use it.
                if (snapshot.nwiFragment) {
                    try {
                        //await restoreExternalWindowPositionAndState(snapshot.externalWindows);
                        await nwiClient.applySnapshotFragment(snapshot.nwiFragment);
                    } catch (err) {
                        console.error(err);
                    }
                }

                return originalPromise;
            }
        };
        return new Override();
    }
});


//Hacky way of launching apps and keeping track of them for snapshot purposes:
const bc = new BroadcastChannel('external-window-snapshot-tracker');
bc.addEventListener('message', e => {

    console.log(e.data);
    externalWindowsLaunched.push(e.data);
    console.log(externalWindowsLaunched);
});
