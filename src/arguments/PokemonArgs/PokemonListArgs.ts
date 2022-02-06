import { BaseFuzzyArgs } from '#arguments/FuzzyArgs/Base';
import { IsNumber, Max, Min } from 'class-validator';
import { ArgsType, Field, Int } from 'type-graphql';

@ArgsType()
export class PokemonListArgs extends BaseFuzzyArgs {
  @Field(() => Int, {
    nullable: true,
    defaultValue: 963,
    description: 'Return only this many results, starting from the offset'
  })
  @IsNumber()
  @Min(1)
  @Max(963)
  public take = 963;
}