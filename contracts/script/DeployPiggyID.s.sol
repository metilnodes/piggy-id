// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {PiggyID} from "../src/PiggyID.sol";

/**
 * @title DeployPiggyID
 * @dev Script to deploy the PiggyID contract
 */
contract DeployPiggyID is Script {
    function run() external returns (PiggyID) {
        vm.startBroadcast();
        PiggyID piggyID = new PiggyID();
        vm.stopBroadcast();
        return piggyID;
    }
}
