/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import { fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { TestController } from './tes/test.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { AuthController } from './auth/auth.controller.js';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CartController } from './cart/cart.controller.js';
import type {
  Request as ExRequest,
  Response as ExResponse,
  RequestHandler,
  Router
} from 'express';

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
  TsoaResponse_string_: {
    dataType: 'refObject',
    properties: {
      resultType: { dataType: 'string', required: true },
      error: { dataType: 'enum', enums: [null], required: true },
      success: { dataType: 'string', required: true }
    },
    additionalProperties: false
  },
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  SendSmsResponse: {
    dataType: 'refObject',
    properties: {
      statusCode: { dataType: 'double', required: true },
      message: { dataType: 'string', required: true }
    },
    additionalProperties: false
  },
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  TsoaResponse_SendSmsResponse_: {
    dataType: 'refObject',
    properties: {
      resultType: { dataType: 'string', required: true },
      error: { dataType: 'enum', enums: [null], required: true },
      success: { ref: 'SendSmsResponse', required: true }
    },
    additionalProperties: false
  },
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  ErrorResponse: {
    dataType: 'refObject',
    properties: {
      resultType: { dataType: 'string', required: true },
      error: {
        dataType: 'nestedObjectLiteral',
        nestedProperties: {
          data: {
            dataType: 'union',
            subSchemas: [
              { dataType: 'any' },
              { dataType: 'enum', enums: [null] }
            ]
          },
          reason: {
            dataType: 'union',
            subSchemas: [
              { dataType: 'string' },
              { dataType: 'enum', enums: [null] }
            ]
          },
          errorCode: { dataType: 'string' }
        },
        required: true
      },
      success: { dataType: 'enum', enums: [null], required: true }
    },
    additionalProperties: false
  },
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  SendSmsRequest: {
    dataType: 'refObject',
    properties: {
      phoneNumber: {
        dataType: 'string',
        required: true,
        validators: {
          pattern: {
            errorMsg: '유효한 휴대폰 번호 형식이 아닙니다 (예: 01012345678)',
            value: '^01[016789]-?\\d{3,4}-?\\d{4}$'
          },
          minLength: { errorMsg: '휴대폰 번호가 너무 짧습니다', value: 10 },
          maxLength: { errorMsg: '휴대폰 번호가 너무 깁니다', value: 13 }
        }
      }
    },
    additionalProperties: false
  },
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  VerifySmsResponse: {
    dataType: 'refObject',
    properties: {
      statusCode: { dataType: 'double', required: true },
      message: { dataType: 'string', required: true }
    },
    additionalProperties: false
  },
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  TsoaResponse_VerifySmsResponse_: {
    dataType: 'refObject',
    properties: {
      resultType: { dataType: 'string', required: true },
      error: { dataType: 'enum', enums: [null], required: true },
      success: { ref: 'VerifySmsResponse', required: true }
    },
    additionalProperties: false
  },
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  VerifySmsRequest: {
    dataType: 'refObject',
    properties: {
      phoneNumber: {
        dataType: 'string',
        required: true,
        validators: {
          pattern: {
            errorMsg: '유효한 휴대폰 번호 형식이 아닙니다. (예: 01012345678)',
            value: '^01[016789]-?\\d{3,4}-?\\d{4}$'
          },
          minLength: { errorMsg: '휴대폰 번호가 너무 짧습니다', value: 10 },
          maxLength: { errorMsg: '휴대폰 번호가 너무 깁니다', value: 13 }
        }
      },
      code: {
        dataType: 'string',
        required: true,
        validators: {
          pattern: {
            errorMsg: '유효한 인증 코드 형식이 아닙니다 (예: 123456)',
            value: '^[0-9]{6}$'
          },
          minLength: { errorMsg: '인증 코드가 너무 짧습니다', value: 6 },
          maxLength: { errorMsg: '인증 코드가 너무 깁니다', value: 6 }
        }
      }
    },
    additionalProperties: false
  },
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  DeleteItemsDTO: {
    dataType: 'refObject',
    properties: {
      cartIds: {
        dataType: 'array',
        array: { dataType: 'string' },
        required: true
      }
    },
    additionalProperties: false
  },
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  TsoaResponse_any_: {
    dataType: 'refObject',
    properties: {
      resultType: { dataType: 'string', required: true },
      error: { dataType: 'enum', enums: [null], required: true },
      success: { dataType: 'object', required: true }
    },
    additionalProperties: false
  },
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  AddToCartDTO: {
    dataType: 'refObject',
    properties: {
      quantity: { dataType: 'double', required: true },
      optionItemIds: {
        dataType: 'array',
        array: { dataType: 'string' },
        required: true
      }
    },
    additionalProperties: false
  }
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {
  noImplicitAdditionalProperties: 'throw-on-extras',
  bodyCoercion: true
});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

export function RegisterRoutes(app: Router) {
  // ###########################################################################################################
  //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
  //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
  // ###########################################################################################################

  const argsTestController_setTest: Record<string, TsoaRoute.ParameterSchema> =
    {};
  app.get(
    '/project',
    ...fetchMiddlewares<RequestHandler>(TestController),
    ...fetchMiddlewares<RequestHandler>(TestController.prototype.setTest),

    async function TestController_setTest(
      request: ExRequest,
      response: ExResponse,
      next: any
    ) {
      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      let validatedArgs: any[] = [];
      try {
        validatedArgs = templateService.getValidatedArgs({
          args: argsTestController_setTest,
          request,
          response
        });

        const controller = new TestController();

        await templateService.apiHandler({
          methodName: 'setTest',
          controller,
          response,
          next,
          validatedArgs,
          successStatus: undefined
        });
      } catch (err) {
        return next(err);
      }
    }
  );
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  const argsAuthController_sendSms: Record<string, TsoaRoute.ParameterSchema> =
    {
      requestBody: {
        in: 'body',
        name: 'requestBody',
        required: true,
        ref: 'SendSmsRequest'
      }
    };
  app.post(
    '/auth/sms/send',
    ...fetchMiddlewares<RequestHandler>(AuthController),
    ...fetchMiddlewares<RequestHandler>(AuthController.prototype.sendSms),

    async function AuthController_sendSms(
      request: ExRequest,
      response: ExResponse,
      next: any
    ) {
      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      let validatedArgs: any[] = [];
      try {
        validatedArgs = templateService.getValidatedArgs({
          args: argsAuthController_sendSms,
          request,
          response
        });

        const controller = new AuthController();

        await templateService.apiHandler({
          methodName: 'sendSms',
          controller,
          response,
          next,
          validatedArgs,
          successStatus: 200
        });
      } catch (err) {
        return next(err);
      }
    }
  );
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  const argsAuthController_verifySms: Record<
    string,
    TsoaRoute.ParameterSchema
  > = {
    requestBody: {
      in: 'body',
      name: 'requestBody',
      required: true,
      ref: 'VerifySmsRequest'
    }
  };
  app.post(
    '/auth/sms/verify',
    ...fetchMiddlewares<RequestHandler>(AuthController),
    ...fetchMiddlewares<RequestHandler>(AuthController.prototype.verifySms),

    async function AuthController_verifySms(
      request: ExRequest,
      response: ExResponse,
      next: any
    ) {
      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      let validatedArgs: any[] = [];
      try {
        validatedArgs = templateService.getValidatedArgs({
          args: argsAuthController_verifySms,
          request,
          response
        });

        const controller = new AuthController();

        await templateService.apiHandler({
          methodName: 'verifySms',
          controller,
          response,
          next,
          validatedArgs,
          successStatus: 200
        });
      } catch (err) {
        return next(err);
      }
    }
  );
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  const argsCartController_removeItemsFromCart: Record<
    string,
    TsoaRoute.ParameterSchema
  > = {
    payload: {
      in: 'body',
      name: 'payload',
      required: true,
      ref: 'DeleteItemsDTO'
    }
  };
  app.delete(
    '/api/v1/cart/items',
    ...fetchMiddlewares<RequestHandler>(CartController),
    ...fetchMiddlewares<RequestHandler>(
      CartController.prototype.removeItemsFromCart
    ),

    async function CartController_removeItemsFromCart(
      request: ExRequest,
      response: ExResponse,
      next: any
    ) {
      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      let validatedArgs: any[] = [];
      try {
        validatedArgs = templateService.getValidatedArgs({
          args: argsCartController_removeItemsFromCart,
          request,
          response
        });

        const controller = new CartController();

        await templateService.apiHandler({
          methodName: 'removeItemsFromCart',
          controller,
          response,
          next,
          validatedArgs,
          successStatus: 200
        });
      } catch (err) {
        return next(err);
      }
    }
  );
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  const argsCartController_addToCart: Record<
    string,
    TsoaRoute.ParameterSchema
  > = {
    itemId: { in: 'path', name: 'itemId', required: true, dataType: 'string' },
    payload: {
      in: 'body',
      name: 'payload',
      required: true,
      ref: 'AddToCartDTO'
    }
  };
  app.post(
    '/api/v1/cart/:itemId',
    ...fetchMiddlewares<RequestHandler>(CartController),
    ...fetchMiddlewares<RequestHandler>(CartController.prototype.addToCart),

    async function CartController_addToCart(
      request: ExRequest,
      response: ExResponse,
      next: any
    ) {
      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      let validatedArgs: any[] = [];
      try {
        validatedArgs = templateService.getValidatedArgs({
          args: argsCartController_addToCart,
          request,
          response
        });

        const controller = new CartController();

        await templateService.apiHandler({
          methodName: 'addToCart',
          controller,
          response,
          next,
          validatedArgs,
          successStatus: 201
        });
      } catch (err) {
        return next(err);
      }
    }
  );
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
  const argsCartController_getCart: Record<string, TsoaRoute.ParameterSchema> =
    {};
  app.get(
    '/api/v1/cart',
    ...fetchMiddlewares<RequestHandler>(CartController),
    ...fetchMiddlewares<RequestHandler>(CartController.prototype.getCart),

    async function CartController_getCart(
      request: ExRequest,
      response: ExResponse,
      next: any
    ) {
      // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

      let validatedArgs: any[] = [];
      try {
        validatedArgs = templateService.getValidatedArgs({
          args: argsCartController_getCart,
          request,
          response
        });

        const controller = new CartController();

        await templateService.apiHandler({
          methodName: 'getCart',
          controller,
          response,
          next,
          validatedArgs,
          successStatus: 200
        });
      } catch (err) {
        return next(err);
      }
    }
  );
  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

  // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
