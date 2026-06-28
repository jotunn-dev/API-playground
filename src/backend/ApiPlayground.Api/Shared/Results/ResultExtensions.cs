using Microsoft.AspNetCore.Http;
using HttpResults = Microsoft.AspNetCore.Http.Results;

namespace ApiPlayground.Api.Shared.Results;

public static class ResultExtensions
{
    public static IResult ToHttpResult<T>(this Result<T> result)
    {
        if (result.IsSuccess)
        {
            return result.StatusCode == 201
                ? HttpResults.Created(string.Empty, result.Value)
                : HttpResults.Ok(result.Value);
        }

        var errorBody = new { error = result.Error, message = result.Message };

        return result.StatusCode switch
        {
            400 => HttpResults.BadRequest(errorBody),
            401 => HttpResults.Unauthorized(),
            409 => HttpResults.Conflict(errorBody),
            502 => HttpResults.Json(errorBody, statusCode: 502),
            504 => HttpResults.Json(errorBody, statusCode: 504),
            _ => HttpResults.Problem(result.Error)
        };
    }
}
