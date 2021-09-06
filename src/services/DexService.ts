import PokemonPaginatedArgs from '#arguments/PokemonPaginatedArgs';
import pokedex from '#assets/pokedex';
import AbilitiesEntry from '#structures/AbilitiesEntry';
import CatchRateEntry from '#structures/CatchRateEntry';
import DexDetails from '#structures/DexDetails';
import DexEntry from '#structures/DexEntry';
import EvYieldsEntry from '#structures/EvYieldsEntry';
import FlavorEntry from '#structures/FlavorEntry';
import GenderEntry from '#structures/GenderEntry';
import StatsEntry from '#structures/StatsEntry';
import { addPropertyToClass } from '#utils/addPropertyToClass';
import FuzzySearch from '#utils/FuzzySearch';
import GraphQLSet from '#utils/GraphQLSet';
import type Pokemon from '#utils/pokemon';
import { parseSpeciesForSprite } from '#utils/spriteParser';
import Util from '#utils/util';
import type Fuse from 'fuse.js';
import { Arg, Args } from 'type-graphql';

export default class DexService {
  private flavors: Record<string, Pokemon.FlavorText[]> | undefined = undefined;
  private tiers: Record<string, string> | undefined = undefined;
  private readonly bulbapediaBaseUrlPrefix = 'https://bulbapedia.bulbagarden.net/wiki/';
  private readonly bulbapediaBaseUrlPostfix = '_(Pokémon)';
  private readonly serebiiBaseUrl = 'https://www.serebii.net/pokedex';
  private readonly smogonBaseUrl = 'https://www.smogon.com/dex';

  public findByNum(@Arg('num') num: number): Pokemon.DexEntry | undefined {
    return pokedex.find((poke) => poke.num === num);
  }

  public findBySpecies(@Arg('species') species: string): Pokemon.DexEntry | undefined {
    return pokedex.get(species);
  }

  public findByFuzzy(@Args() { pokemon, skip, take }: PokemonPaginatedArgs, requestedFields: GraphQLSet<unknown>): DexEntry[] {
    const paginatedFuzzyResult = this.getByFuzzy({ pokemon, skip, take });

    const queryResults: DexEntry[] = [];
    for (const page of paginatedFuzzyResult) {
      const dexEntry = new DexEntry();

      const genderData = new GenderEntry();
      const baseStatsData = new StatsEntry();
      const evYieldsData = new EvYieldsEntry();
      const abilitiesData = new AbilitiesEntry();
      const catchRateData = new CatchRateEntry();
      const pageGenderRatio: Pokemon.DexEntry['genderRatio'] = page.item.genderRatio || {
        male: 0.5,
        female: 0.5
      };
      const pageCatchRate: Pokemon.DexEntry['catchRate'] = page.item.catchRate || {
        base: 0,
        percentageWithOrdinaryPokeballAtFullHealth: '0%'
      };

      addPropertyToClass(genderData, 'male', `${pageGenderRatio.male * 100}%`, requestedFields as GraphQLSet<keyof GenderEntry>, 'gender.male');
      addPropertyToClass(genderData, 'female', `${pageGenderRatio.female * 100}%`, requestedFields as GraphQLSet<keyof GenderEntry>, 'gender.female');

      addPropertyToClass(baseStatsData, 'hp', page.item.baseStats.hp, requestedFields as GraphQLSet<keyof StatsEntry>, 'baseStats.hp');
      addPropertyToClass(baseStatsData, 'attack', page.item.baseStats.atk, requestedFields as GraphQLSet<keyof StatsEntry>, 'baseStats.attack');
      addPropertyToClass(baseStatsData, 'defense', page.item.baseStats.def, requestedFields as GraphQLSet<keyof StatsEntry>, 'baseStats.defense');
      addPropertyToClass(
        baseStatsData,
        'specialattack',
        page.item.baseStats.spa,
        requestedFields as GraphQLSet<keyof StatsEntry>,
        'baseStats.specialattack'
      );
      addPropertyToClass(
        baseStatsData,
        'specialdefense',
        page.item.baseStats.spd,
        requestedFields as GraphQLSet<keyof StatsEntry>,
        'baseStats.specialdefense'
      );
      addPropertyToClass(baseStatsData, 'speed', page.item.baseStats.spe, requestedFields as GraphQLSet<keyof StatsEntry>, 'baseStats.speed');

      const evYieldsRequestedFields = Util.cast<GraphQLSet<keyof EvYieldsEntry>>(requestedFields);
      addPropertyToClass(evYieldsData, 'hp', page.item.evYields.hp, evYieldsRequestedFields, 'evYields.hp');
      addPropertyToClass(evYieldsData, 'attack', page.item.evYields.atk, evYieldsRequestedFields, 'evYields.attack');
      addPropertyToClass(evYieldsData, 'defense', page.item.evYields.def, evYieldsRequestedFields, 'evYields.defense');
      addPropertyToClass(evYieldsData, 'specialattack', page.item.evYields.spa, evYieldsRequestedFields, 'evYields.specialattack');
      addPropertyToClass(evYieldsData, 'specialdefense', page.item.evYields.spd, evYieldsRequestedFields, 'evYields.specialdefense');
      addPropertyToClass(evYieldsData, 'speed', page.item.evYields.spe, evYieldsRequestedFields, 'evYields.speed');

      addPropertyToClass(abilitiesData, 'first', page.item.abilities.first, requestedFields as GraphQLSet<keyof AbilitiesEntry>, 'abilities.first');
      addPropertyToClass(
        abilitiesData,
        'second',
        page.item.abilities.second,
        requestedFields as GraphQLSet<keyof AbilitiesEntry>,
        'abilities.second'
      );
      addPropertyToClass(
        abilitiesData,
        'hidden',
        page.item.abilities.hidden,
        requestedFields as GraphQLSet<keyof AbilitiesEntry>,
        'abilities.hidden'
      );
      addPropertyToClass(
        abilitiesData,
        'special',
        page.item.abilities.special,
        requestedFields as GraphQLSet<keyof AbilitiesEntry>,
        'abilities.special'
      );

      addPropertyToClass(catchRateData, 'base', pageCatchRate.base, requestedFields as GraphQLSet<keyof CatchRateEntry>, 'catchRate.base');
      addPropertyToClass(
        catchRateData,
        'percentageWithOrdinaryPokeballAtFullHealth',
        pageCatchRate.percentageWithOrdinaryPokeballAtFullHealth,
        requestedFields as GraphQLSet<keyof CatchRateEntry>,
        'catchRate.percentageWithOrdinaryPokeballAtFullHealth'
      );

      const dexEntryFields = requestedFields as GraphQLSet<keyof DexEntry>;
      addPropertyToClass(dexEntry, 'abilities', abilitiesData, dexEntryFields);
      addPropertyToClass(dexEntry, 'gender', genderData, dexEntryFields);
      addPropertyToClass(dexEntry, 'baseStats', baseStatsData, dexEntryFields);
      addPropertyToClass(dexEntry, 'catchRate', catchRateData, dexEntryFields);
      addPropertyToClass(dexEntry, 'num', page.item.num, dexEntryFields);
      addPropertyToClass(dexEntry, 'species', page.item.species, dexEntryFields);
      addPropertyToClass(dexEntry, 'types', page.item.types, dexEntryFields);
      addPropertyToClass(dexEntry, 'color', page.item.color, dexEntryFields);
      addPropertyToClass(dexEntry, 'eggGroups', page.item.eggGroups, dexEntryFields);
      addPropertyToClass(dexEntry, 'evolutionLevel', page.item.evoLevel, dexEntryFields);
      addPropertyToClass(dexEntry, 'evos', page.item.evos, dexEntryFields);
      addPropertyToClass(dexEntry, 'prevo', page.item.prevo, dexEntryFields);
      addPropertyToClass(dexEntry, 'forme', page.item.forme, dexEntryFields);
      addPropertyToClass(dexEntry, 'formeLetter', page.item.formeLetter, dexEntryFields);
      addPropertyToClass(dexEntry, 'height', page.item.heightm, dexEntryFields);
      addPropertyToClass(dexEntry, 'weight', page.item.weightkg, dexEntryFields);
      addPropertyToClass(dexEntry, 'baseForme', page.item.baseForme, dexEntryFields);
      addPropertyToClass(dexEntry, 'baseSpecies', page.item.baseSpecies, dexEntryFields);
      addPropertyToClass(dexEntry, 'otherFormes', page.item.otherFormes, dexEntryFields);
      addPropertyToClass(dexEntry, 'cosmeticFormes', page.item.cosmeticFormes, dexEntryFields);
      addPropertyToClass(dexEntry, 'levellingRate', page.item.levellingRate, dexEntryFields);
      addPropertyToClass(dexEntry, 'minimumHatchTime', page.item.minimumHatchTime, dexEntryFields);
      addPropertyToClass(dexEntry, 'isEggObtainable', page.item.isEggObtainable, dexEntryFields);

      queryResults.push(dexEntry);
    }

    return queryResults;
  }

  public async findBySpeciesWithDetails(
    basePokemonData: Pokemon.DexEntry,
    skip: number,
    take: number,
    requestedFields: GraphQLSet<unknown>,
    reverse?: boolean,
    parsingPokemon = '',
    recursingAs: 'preevolutions' | 'evolutions' | false = false
  ): Promise<DexDetails> {
    if (this.flavors === undefined) {
      this.flavors = (await import('#jsonAssets/flavorText.json')).default;
    }

    if (this.tiers === undefined) {
      this.tiers = (await import('#jsonAssets/formats.json')).default;
    }

    const pokemonData = new DexDetails();
    const genderData = new GenderEntry();
    const baseStatsData = new StatsEntry();
    const evYieldsData = new EvYieldsEntry();
    const abilitiesData = new AbilitiesEntry();
    const catchRateData = new CatchRateEntry();
    const evolutionChain: Promise<DexDetails>[] = [];
    const preevolutionChain: Promise<DexDetails>[] = [];
    const basePokemonGenderRatio: Pokemon.DexEntry['genderRatio'] = basePokemonData.genderRatio || {
      male: 0.5,
      female: 0.5
    };
    const basePokemonCatchRate: Pokemon.DexEntry['catchRate'] = basePokemonData.catchRate || {
      base: 0,
      percentageWithOrdinaryPokeballAtFullHealth: '0%'
    };

    const genderEntryRequestedFields = Util.cast<GraphQLSet<keyof GenderEntry>>(requestedFields);
    addPropertyToClass(
      genderData,
      'male',
      `${basePokemonGenderRatio.male * 100}%`,
      genderEntryRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}gender.male`
    );
    addPropertyToClass(
      genderData,
      'female',
      `${basePokemonGenderRatio.female * 100}%`,
      genderEntryRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}gender.female`
    );

    const baseStatsRequestedFields = Util.cast<GraphQLSet<keyof StatsEntry>>(requestedFields);
    addPropertyToClass(
      baseStatsData,
      'hp',
      basePokemonData.baseStats.hp,
      baseStatsRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}baseStats.hp`
    );
    addPropertyToClass(
      baseStatsData,
      'attack',
      basePokemonData.baseStats.atk,
      baseStatsRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}baseStats.attack`
    );
    addPropertyToClass(
      baseStatsData,
      'defense',
      basePokemonData.baseStats.def,
      baseStatsRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}baseStats.defense`
    );
    addPropertyToClass(
      baseStatsData,
      'specialattack',
      basePokemonData.baseStats.spa,
      baseStatsRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}baseStats.specialattack`
    );
    addPropertyToClass(
      baseStatsData,
      'specialdefense',
      basePokemonData.baseStats.spd,
      baseStatsRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}baseStats.specialdefense`
    );
    addPropertyToClass(
      baseStatsData,
      'speed',
      basePokemonData.baseStats.spe,
      baseStatsRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}baseStats.speed`
    );

    const evYieldsRequestedFields = Util.cast<GraphQLSet<keyof EvYieldsEntry>>(requestedFields);
    addPropertyToClass(
      evYieldsData,
      'hp',
      basePokemonData.evYields.hp,
      evYieldsRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}evYields.hp`
    );
    addPropertyToClass(
      evYieldsData,
      'attack',
      basePokemonData.evYields.atk,
      evYieldsRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}evYields.attack`
    );
    addPropertyToClass(
      evYieldsData,
      'defense',
      basePokemonData.evYields.def,
      evYieldsRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}evYields.defense`
    );
    addPropertyToClass(
      evYieldsData,
      'specialattack',
      basePokemonData.evYields.spa,
      evYieldsRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}evYields.specialattack`
    );
    addPropertyToClass(
      evYieldsData,
      'specialdefense',
      basePokemonData.evYields.spd,
      evYieldsRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}evYields.specialdefense`
    );
    addPropertyToClass(
      evYieldsData,
      'speed',
      basePokemonData.evYields.spe,
      evYieldsRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}evYields.speed`
    );

    const abilitiesRequestedFields = Util.cast<GraphQLSet<keyof AbilitiesEntry>>(requestedFields);
    addPropertyToClass(
      abilitiesData,
      'first',
      basePokemonData.abilities.first,
      abilitiesRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}abilities.first`
    );
    addPropertyToClass(
      abilitiesData,
      'second',
      basePokemonData.abilities.second,
      abilitiesRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}abilities.second`
    );
    addPropertyToClass(
      abilitiesData,
      'hidden',
      basePokemonData.abilities.hidden,
      abilitiesRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}abilities.hidden`
    );
    addPropertyToClass(
      abilitiesData,
      'special',
      basePokemonData.abilities.special,
      abilitiesRequestedFields,
      `${recursingAs ? `${recursingAs}.` : ''}abilities.special`
    );

    addPropertyToClass(
      catchRateData,
      'base',
      basePokemonCatchRate.base,
      requestedFields as GraphQLSet<keyof CatchRateEntry>,
      `${recursingAs ? `${recursingAs}.` : ''}catchRate.base`
    );
    addPropertyToClass(
      catchRateData,
      'percentageWithOrdinaryPokeballAtFullHealth',
      basePokemonCatchRate.percentageWithOrdinaryPokeballAtFullHealth,
      requestedFields as GraphQLSet<keyof CatchRateEntry>,
      `${recursingAs ? `${recursingAs}.` : ''}catchRate.percentageWithOrdinaryPokeballAtFullHealth`
    );

    const dexDetailsFields = Util.cast<GraphQLSet<keyof DexDetails>>(requestedFields);
    addPropertyToClass(pokemonData, 'abilities', abilitiesData, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}abilities`);
    addPropertyToClass(pokemonData, 'gender', genderData, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}gender`);
    addPropertyToClass(pokemonData, 'baseStats', baseStatsData, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}baseStats`);
    addPropertyToClass(pokemonData, 'evYields', evYieldsData, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}evYields`);
    addPropertyToClass(pokemonData, 'catchRate', catchRateData, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}catchRate`);
    addPropertyToClass(pokemonData, 'num', basePokemonData.num, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}num`);
    addPropertyToClass(pokemonData, 'species', basePokemonData.species, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}species`);
    addPropertyToClass(pokemonData, 'types', basePokemonData.types, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}types`);
    addPropertyToClass(pokemonData, 'color', basePokemonData.color, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}color`);
    addPropertyToClass(pokemonData, 'eggGroups', basePokemonData.eggGroups, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}eggGroups`);
    addPropertyToClass(
      pokemonData,
      'evolutionLevel',
      basePokemonData.evoLevel,
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}evolutionLevel`
    );
    addPropertyToClass(pokemonData, 'evos', basePokemonData.evos, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}evos`);
    addPropertyToClass(pokemonData, 'prevo', basePokemonData.prevo, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}prevo`);
    const smogonTier = this.tiers[Util.toLowerSingleWordCase(basePokemonData.species)] || 'Undiscovered';
    addPropertyToClass(pokemonData, 'smogonTier', smogonTier, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}smogonTier`);
    addPropertyToClass(pokemonData, 'height', basePokemonData.heightm, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}height`);
    addPropertyToClass(pokemonData, 'weight', basePokemonData.weightkg, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}weight`);
    addPropertyToClass(pokemonData, 'baseForme', basePokemonData.baseForme, dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}baseForme`);
    addPropertyToClass(
      pokemonData,
      'baseSpecies',
      basePokemonData.baseSpecies,
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}baseSpecies`
    );
    addPropertyToClass(
      pokemonData,
      'otherFormes',
      basePokemonData.otherFormes,
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}otherFormes`
    );
    addPropertyToClass(
      pokemonData,
      'cosmeticFormes',
      basePokemonData.cosmeticFormes,
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}cosmeticFormes`
    );
    addPropertyToClass(
      pokemonData,
      'baseStatsTotal',
      this.parseBaseStatsTotal(basePokemonData.baseStats),
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}baseStatsTotal`
    );
    addPropertyToClass(
      pokemonData,
      'levellingRate',
      basePokemonData.levellingRate,
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}levellingRate`
    );
    addPropertyToClass(
      pokemonData,
      'minimumHatchTime',
      basePokemonData.minimumHatchTime,
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}minimumHatchTime`
    );
    addPropertyToClass(
      pokemonData,
      'maximumHatchTime',
      this.parseMinimumHatchTimeForMaximumHatchTime(basePokemonData.minimumHatchTime),
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}maximumHatchTime`
    );
    addPropertyToClass(
      pokemonData,
      'isEggObtainable',
      basePokemonData.isEggObtainable,
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}isEggObtainable`
    );
    addPropertyToClass(pokemonData, 'flavorTexts', [], dexDetailsFields, `${recursingAs ? `${recursingAs}.` : ''}flavorTexts`);
    addPropertyToClass(
      pokemonData,
      'serebiiPage',
      this.parseSpeciesForSerebiiPage(basePokemonData.baseSpecies ?? basePokemonData.species, basePokemonData.num, smogonTier),
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}serebiiPage`
    );
    addPropertyToClass(
      pokemonData,
      'bulbapediaPage',
      basePokemonData.num >= 1 ? this.parseSpeciesForBulbapedia(basePokemonData) : '',
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}bulbapediaPage`
    );
    addPropertyToClass(
      pokemonData,
      'smogonPage',
      this.parseSpeciesForSmogonPage(basePokemonData.species, basePokemonData.num, smogonTier),
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}smogonPage`
    );
    addPropertyToClass(
      pokemonData,
      'sprite',
      parseSpeciesForSprite({
        pokemonName: basePokemonData.species,
        baseSpecies: basePokemonData.baseSpecies,
        specialSprite: basePokemonData.specialSprite,
        specialShinySprite: basePokemonData.specialShinySprite,
        specialBackSprite: basePokemonData.specialBackSprite,
        specialShinyBackSprite: basePokemonData.specialShinyBackSprite
      }),
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}sprite`
    );
    addPropertyToClass(
      pokemonData,
      'shinySprite',
      parseSpeciesForSprite({
        pokemonName: basePokemonData.species,
        baseSpecies: basePokemonData.baseSpecies,
        specialSprite: basePokemonData.specialSprite,
        specialShinySprite: basePokemonData.specialShinySprite,
        specialBackSprite: basePokemonData.specialBackSprite,
        specialShinyBackSprite: basePokemonData.specialShinyBackSprite,
        shiny: true
      }),
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}shinySprite`
    );
    addPropertyToClass(
      pokemonData,
      'backSprite',
      parseSpeciesForSprite({
        pokemonName: basePokemonData.species,
        baseSpecies: basePokemonData.baseSpecies,
        specialSprite: basePokemonData.specialSprite,
        specialShinySprite: basePokemonData.specialShinySprite,
        specialBackSprite: basePokemonData.specialBackSprite,
        specialShinyBackSprite: basePokemonData.specialShinyBackSprite,
        backSprite: true
      }),
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}backSprite`
    );
    addPropertyToClass(
      pokemonData,
      'shinyBackSprite',
      parseSpeciesForSprite({
        pokemonName: basePokemonData.species,
        baseSpecies: basePokemonData.baseSpecies,
        specialSprite: basePokemonData.specialSprite,
        specialShinySprite: basePokemonData.specialShinySprite,
        specialBackSprite: basePokemonData.specialBackSprite,
        specialShinyBackSprite: basePokemonData.specialShinyBackSprite,
        shiny: true,
        backSprite: true
      }),
      dexDetailsFields,
      `${recursingAs ? `${recursingAs}.` : ''}shinyBackSprite`
    );

    if ((requestedFields as GraphQLSet<string>).has(`${recursingAs ? `${recursingAs}.` : ''}flavorTexts`) && basePokemonData.num >= 0) {
      let shouldParseBaseForme = true;
      if (basePokemonData.forme) {
        const formFlavors = this.flavors[`${basePokemonData.num}${basePokemonData.forme.toLowerCase()}`];
        if (formFlavors) {
          shouldParseBaseForme = false;
          for (const formFlavor of formFlavors) {
            const formFlavorEntry = new FlavorEntry();
            formFlavorEntry.game = formFlavor.version_id;
            formFlavorEntry.flavor = formFlavor.flavor_text;
            pokemonData.flavorTexts.push(formFlavorEntry);
          }
        }
      }

      if (shouldParseBaseForme) {
        const baseFlavors = this.flavors[basePokemonData.num];
        for (const baseFlavor of baseFlavors) {
          const formFlavorEntry = new FlavorEntry();
          formFlavorEntry.game = baseFlavor.version_id;
          formFlavorEntry.flavor = baseFlavor.flavor_text;
          pokemonData.flavorTexts.push(formFlavorEntry);
        }
      }

      if (reverse) {
        pokemonData.flavorTexts.reverse();
      }

      pokemonData.flavorTexts = pokemonData.flavorTexts.slice(skip, skip + take);
    }

    if (
      (requestedFields as GraphQLSet<string>).has(`${recursingAs ? `${recursingAs}.` : ''}preevolutions`) &&
      basePokemonData.prevo &&
      basePokemonData.prevo !== parsingPokemon
    ) {
      const prevoPokemon = this.findBySpecies(basePokemonData.prevo);
      if (prevoPokemon) {
        preevolutionChain.push(
          this.findBySpeciesWithDetails(
            this.findBySpecies(Util.toLowerSingleWordCase(prevoPokemon.species))!,
            skip,
            take,
            requestedFields,
            reverse,
            this.parseDataForEvolutionRecursion(basePokemonData, prevoPokemon),
            'preevolutions'
          )
        );
      }

      addPropertyToClass(
        pokemonData,
        'preevolutions',
        await Promise.all(preevolutionChain),
        dexDetailsFields,
        `${recursingAs ? `${recursingAs}.` : ''}preevolutions`
      );
    }

    if (
      (requestedFields as GraphQLSet<string>).has(`${recursingAs ? `${recursingAs}.` : ''}evolutions`) &&
      basePokemonData.evos &&
      basePokemonData.evos[0] !== parsingPokemon
    ) {
      for (const evo of basePokemonData.evos) {
        const evoPokemon = this.findBySpecies(Util.toLowerSingleWordCase(evo));
        if (evoPokemon) {
          evolutionChain.push(
            this.findBySpeciesWithDetails(
              this.findBySpecies(Util.toLowerSingleWordCase(evoPokemon.species))!,
              skip,
              take,
              requestedFields,
              reverse,
              this.parseDataForEvolutionRecursion(basePokemonData, evoPokemon),
              'evolutions'
            )
          );
        }
      }

      addPropertyToClass(
        pokemonData,
        'evolutions',
        await Promise.all(evolutionChain),
        dexDetailsFields,
        `${recursingAs ? `${recursingAs}.` : ''}evolutions`
      );
    }

    return pokemonData;
  }

  public getByFuzzy(@Args() { pokemon, skip, take }: PokemonPaginatedArgs): Fuse.FuseResult<Pokemon.DexEntry>[] {
    pokemon = this.parseFormeIdentifiers(pokemon);

    const fuzzyResult = new FuzzySearch(pokedex, ['num', 'species'], { threshold: 0.3 }).runFuzzy(pokemon);
    if (!fuzzyResult.length) {
      throw new Error(`No Pokémon found for ${pokemon}`);
    }

    return fuzzyResult.slice(skip, skip + take);
  }

  private parseDataForEvolutionRecursion(basePokemonData: Pokemon.DexEntry, evoChainData: Pokemon.DexEntry) {
    if (basePokemonData.forme && evoChainData.forme && basePokemonData.forme === evoChainData.forme) {
      return Util.toLowerSingleWordCase(basePokemonData.species);
    }

    return basePokemonData.baseSpecies?.toLowerCase() || basePokemonData.species;
  }

  private parseSpeciesForBulbapedia(pokemonData: Pokemon.DexEntry) {
    if (pokemonData.specialBulbapediaUrl) {
      return this.bulbapediaBaseUrlPrefix + pokemonData.specialBulbapediaUrl + this.bulbapediaBaseUrlPostfix;
    }

    if (pokemonData.baseSpecies) {
      return this.bulbapediaBaseUrlPrefix + pokemonData.baseSpecies + this.bulbapediaBaseUrlPostfix;
    }

    return this.bulbapediaBaseUrlPrefix + pokemonData.species + this.bulbapediaBaseUrlPostfix;
  }

  /**
   * Parses data from a Pokémon into a valid Serebii URL
   * @param pokemonName The name of the Pokémon to parse, required for new Serebii pages
   * @param pokemonNumber The number of the Pokémon to parse, required for old Serebii pages
   * @param pokemonTier The smogon tier of the Pokémon, required to check if the Pokémon is available in Generation 8
   */
  private parseSpeciesForSerebiiPage(pokemonName: string, pokemonNumber: number, pokemonTier: string) {
    // If the Pokémon has a number of 0 or lower (0 is Missingno, negatives are Smogon CAP) then it doesn't have a Serebii page
    if (pokemonNumber <= 0) return '';

    if (pokemonTier.toLowerCase() === 'past') {
      // If the Pokémon is not in Generation 8 then build a Generation 7 based URL
      return `${this.serebiiBaseUrl}-sm/${pokemonNumber < 100 ? pokemonNumber.toString().padStart(3, '0') : pokemonNumber}.shtml`;
    }

    // If the Pokémon is available in Generation 8 then build a Generation 8 based URL
    return `${this.serebiiBaseUrl}-swsh/${pokemonName.replace(/ /g, '').toLowerCase()}`;
  }

  /**
   * Parses data from a Pokémon into a valid Smogon Dex URL
   * @param pokemonName The name of the Pokémon to parse
   * @param pokemonNumber The number of the Pokémon to parse
   * @param pokemonTier The smogon tier of the Pokémon, required to check if the Pokémon is available in Generation 8
   */
  private parseSpeciesForSmogonPage(pokemonName: string, pokemonNumber: number, pokemonTier: string) {
    // If the Pokémon has a number of 0 or lower (0 is Missingno, negatives are Smogon CAP) then it doesn't have a Serebii page
    if (pokemonNumber <= 0) return '';

    if (pokemonTier.toLowerCase() === 'past') {
      // If the Pokémon is not in Generation 8 then build a Generation 7 based URL
      return `${this.smogonBaseUrl}/sm/pokemon/${Util.toLowerHyphenCase(pokemonName)}`;
    }

    // If the Pokémon is available in Generation 8 then build a Generation 8 based URL
    return `${this.smogonBaseUrl}/ss/pokemon/${Util.toLowerHyphenCase(pokemonName.replace(/:/g, ''))}`;
  }

  private parseBaseStatsTotal(baseStats: Pokemon.Stats) {
    return baseStats.hp + baseStats.atk + baseStats.def + baseStats.spa + baseStats.spd + baseStats.spe;
  }

  private parseMinimumHatchTimeForMaximumHatchTime(minimumHatchTime?: number) {
    return minimumHatchTime ? minimumHatchTime + 256 : undefined;
  }

  private parseFormeIdentifiers(pokemon: string) {
    switch (pokemon.split(' ')[0]) {
      case 'mega':
        pokemon = `${pokemon.substring(pokemon.split(' ')[0].length + 1)}-mega`;
        break;
      case 'gigantamax':
      case 'gmax':
        pokemon = `${pokemon.substring(pokemon.split(' ')[0].length + 1)}-gmax`;
        break;
      case 'alola':
      case 'alolan':
        pokemon = `${pokemon.substring(pokemon.split(' ')[0].length + 1)}-alola`;
        break;
      case 'galar':
      case 'galarian':
        pokemon = `${pokemon.substring(pokemon.split(' ')[0].length + 1)}-galar`;
        break;
      default:
        break;
    }

    if (pokemon.startsWith('mega')) pokemon = `${pokemon.substring(4, pokemon.length)}mega`;
    if (pokemon.startsWith('gmax') || pokemon.startsWith('gigantamax')) pokemon = `${pokemon.substring(4, pokemon.length)}gmax`;
    if (pokemon.startsWith('alola') || pokemon.startsWith('alolan')) pokemon = `${pokemon.substring(4, pokemon.length)}alola`;
    if (pokemon.startsWith('galar') || pokemon.startsWith('galarian')) pokemon = `${pokemon.substring(4, pokemon.length)}galar`;

    return pokemon;
  }
}
