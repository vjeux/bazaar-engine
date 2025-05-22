### Notes

- Crit is only checked/applied to items with a Cooldown.
- Most Cards have an internal cooldown for max firing per second. See [constants.ts](../engine2/constants.ts) for the `CARD_INTERNAL_COOLDOWN_FIRES_PER_SECOND` value. Applies to multicast as well as responsive items such as caltrops (deal x damage whenever your opponent uses a weapon)

Card fired vs used

- Fired uses ammo, on cooldownmax
- used is multicast

Start of fight poison and burn process a tick and apply before the fight starts. see https://youtu.be/drSgR3E8hyA?si=7bCT_ZmLYXBlySGM&t=635.

### TODOS:

- [x] add better multicast
- [x] use getPlayerAttribute for the palces where it's needed.
- [x] Carry charge onto next use, instead of simply loosing it. maybe just let items charge past CooldownMax and minus CooldownMax on fire?
- [ ] Dont fire events until after the card has finished executing its commands. Some internal queue maybe idk.
- [ ] Should probably modify the boardCard implementation to be a class that tracks its own attributes and enchantments etc.
- [ ] use internal queue not only for multicast, but also for triggers, like "when you slow, deal damage", Proboscis should have an internal cooldown/max fire rate. https://www.howbazaar.gg/items?isShowingAdvancedFilters=true#Proboscis
- [ ] Fork [BazaarPlannerMod](https://github.com/oceanseth/BazaarPlannerMod) and implement websocket connection to client browser.
- [ ] Fix last transformation actions. Will have to implement tooltip parsing since the transformation target it server side.
- [x] Add support for modifying skill tier
- [x] limit boardcard attribute values to .1 digits


### ASSUMPTIONS (that might lead to bugs):

- We assume skills are defined as being on the board for their location
- Assume monsters have no cards in stash (we get none from the api)
- SelfBoard includes skills, while SelfHand is only CardItems
