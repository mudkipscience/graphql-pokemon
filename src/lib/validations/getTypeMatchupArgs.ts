import { TypesEnum } from '#utils/pokemonTypes';
import { s, type SchemaOf } from '@sapphire/shapeshift';
import type { Nullish } from '@sapphire/utilities';

export interface GetTypeMatchupArgs {
  /**
   * The primary type to check
   */
  primaryType: TypesEnum;
  /**
   * The secondary type to check
   */
  secondaryType?: TypesEnum | Nullish;
}

const getTypeMatchupSchema: SchemaOf<GetTypeMatchupArgs> = s.object({
  primaryType: s.nativeEnum(TypesEnum, { message: 'The primary type has to be a valid type' }),
  secondaryType: s.nativeEnum(TypesEnum, { message: 'The secondary type has to be a valid type' }).nullish()
});

export function validateGetTypeMatchupArgs(args: GetTypeMatchupArgs): GetTypeMatchupArgs {
  return getTypeMatchupSchema.parse(args);
}
