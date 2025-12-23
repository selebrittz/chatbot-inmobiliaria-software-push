import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV?: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT?: number = 3000;

  @IsString()
  @IsOptional()
  MONGODB_URI?: string = 'mongodb://localhost:27017/inmobiliaria-formosa';

  @IsString()
  @IsOptional()
  WHATSAPP_SESSION_PATH?: string = './.wwebjs_auth';

  @IsString()
  @IsOptional()
  WHATSAPP_HEADLESS?: string = 'true';

  @IsNumber()
  @IsOptional()
  USD_TO_ARS_RATE?: number = 1000;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}

