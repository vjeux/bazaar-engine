### Notes

- Crit is only checked/applied to items with a Cooldown.
- Most Cards have an internal cooldown for max firing per second. See [constants.ts](../engine2/constants.ts) for the `CARD_INTERNAL_COOLDOWN_FIRES_PER_SECOND` value. Applies to multicast as well as responsive items such as caltrops (deal x damage whenever your opponent uses a weapon)

Card fired vs used

- Fired uses ammo, on cooldownmax
- used is multicast


Start of fight poison and burn process a tick and apply before the fight starts. see https://youtu.be/drSgR3E8hyA?si=7bCT_ZmLYXBlySGM&t=635.

### TODOS:

- [ ] add better multicast
- [ ] Dont fire events until after the card has finished executing its commands. Some internal queue maybe idk.
- [ ] use getPlayerAttribute for the palces where it's needed.
- [ ] Carry charge onto next use, instead of simply loosing it. maybe just let items charge past CooldownMax and minus CooldownMax on fire?
- [ ] Might be emitting cardFired events upon skill activation, need to check
- [ ] Should probably modify the boardCard implementation to be a class that tracks its own attributes and enchantments etc.

### BUGS:

- Atlatl cooldown not working
- Multicast is currently disabled until I implement internal card queue system
- Rapid Injection System - Ahexa encounter infinite loop

### ASSUMPTIONS (that might lead to bugs):

- We assume skills are defined as being on the board for their location
- Assume monsters have no cards in stash (we get none from the api)
- SelfBoard includes skills, while SelfHand is only CardItems


make sure attribute setter for

heal caps at maxhealth
lifesteal caps at maxhealth