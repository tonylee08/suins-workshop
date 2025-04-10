module suins_workshop::suins_workshop;

use std::string::String;
use sui::clock::Clock;
use sui::vec_set::{Self, VecSet};
use suins::controller::set_target_address;
use suins::domain;
use suins::name_record::NameRecord;
use suins::registry::{Registry, lookup};
use suins::suins::SuiNS;
use suins::suins_registration::SuinsRegistration;

const EWhitelistNotSet: u64 = 1;
const EIncorrectNft: u64 = 2;
const EAddressNotWhitelisted: u64 = 3;
const EAddressAlreadyWhitelisted: u64 = 4;

public struct WhiteListAddresses has key {
    id: UID,
    nft_id: ID,
    whitelisted_addresses: VecSet<address>,
}

public fun create_whitelist(
    suins: &mut SuiNS,
    nft: &SuinsRegistration,
    clock: &Clock,
    ctx: &mut TxContext,
): WhiteListAddresses {
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
    whitelist
}

public fun share(whitelist: WhiteListAddresses) {
    transfer::share_object(whitelist);
}

public fun add_whitelist(
    nft: &SuinsRegistration,
    whitelist: &mut WhiteListAddresses,
    whitelisted_address: address,
) {
    assert!(whitelist.nft_id == nft.uid().to_inner(), EIncorrectNft);
    assert!(
        !whitelist.whitelisted_addresses.contains(&whitelisted_address),
        EAddressAlreadyWhitelisted,
    );
    whitelist.whitelisted_addresses.insert(whitelisted_address);
}

public fun remove_whitelist(
    nft: &SuinsRegistration,
    whitelist: &mut WhiteListAddresses,
    whitelisted_address: address,
) {
    assert!(whitelist.nft_id == nft.uid().to_inner(), EIncorrectNft);
    assert!(whitelist.whitelisted_addresses.contains(&whitelisted_address), EAddressNotWhitelisted);
    whitelist.whitelisted_addresses.remove(&whitelisted_address);
}

public fun is_whitelisted(whitelist: &WhiteListAddresses, addr: address): bool {
    whitelist.whitelisted_addresses.contains(&addr)
}

public fun whitelisted_addresses(whitelist: &WhiteListAddresses): VecSet<address> {
    whitelist.whitelisted_addresses
}

public fun whitelist_id(suins: &SuiNS, domain_name: String): ID {
    let registry = suins.registry<Registry>();
    let domain = domain::new(domain_name);
    let name_record = registry.lookup(domain).borrow<NameRecord>();

    let whitelist_option = name_record.target_address();
    assert!(whitelist_option.is_some(), EWhitelistNotSet);

    let whitelist_address = whitelist_option.get_with_default<address>(@0x0);
    let whitelist_id = object::id_from_address(whitelist_address);

    whitelist_id
}
