/// Module: test_deps
module suins_workshop::suins_workshop;

use sui::clock::Clock;
use sui::vec_set::{Self, VecSet};
use suins::controller::set_target_address;
use suins::domain::Domain;
use suins::name_record::NameRecord;
use suins::registry::{Registry, lookup};
use suins::suins::SuiNS;
use suins::suins_registration::SuinsRegistration;

const EWhitelistNotSet: u64 = 1;
const EIncorrectNft: u64 = 2;

public struct WhiteListAddresses has key, store {
    id: UID,
    nft_id: ID,
    whitelisted_addresses: VecSet<address>,
}

public fun create_whitelist(
    suins: &mut SuiNS,
    nft: &SuinsRegistration,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let uid = object::new(ctx);
    let id = uid.to_address();
    let whitelist = WhiteListAddresses {
        id: uid,
        nft_id: nft.uid().to_inner(),
        whitelisted_addresses: vec_set::empty(),
    };

    set_target_address(
        suins,
        nft,
        option::some(id),
        clock,
    );
    transfer::share_object(whitelist);
}

public fun add_whitelist(
    nft: &SuinsRegistration,
    whitelist: &mut WhiteListAddresses,
    whitelisted_address: address,
) {
    assert!(whitelist.nft_id == nft.uid().to_inner(), EIncorrectNft);
    whitelist.whitelisted_addresses.insert(whitelisted_address);
}

public fun remove_whitelist(
    nft: &SuinsRegistration,
    whitelist: &mut WhiteListAddresses,
    whitelisted_address: address,
) {
    assert!(whitelist.nft_id == nft.uid().to_inner(), EIncorrectNft);
    whitelist.whitelisted_addresses.remove(&whitelisted_address);
}

public fun is_whitelisted(whitelist: &WhiteListAddresses, addr: address): bool {
    whitelist.whitelisted_addresses.contains(&addr)
}

public fun whitelisted_addresses(whitelist: &WhiteListAddresses): VecSet<address> {
    whitelist.whitelisted_addresses
}

public fun whitelist_id(registry: &Registry, domain: Domain): address {
    let name_record = registry.lookup(domain).borrow<NameRecord>();

    let whitelist_object = name_record.target_address().get_with_default<address>(@0x0);
    assert!(whitelist_object != @0x0, EWhitelistNotSet);

    whitelist_object
}
