import assert from 'assert';
import typeis from '../lib/index.mjs';

describe('typeis(req, types)', () => {
  it('should ignore params', () => {
    const req = createRequest('text/html; charset=utf-8');
    assert.strictEqual(typeis(req, ['text/*']), 'text/html');
  });

  it('should ignore params LWS', () => {
    const req = createRequest('text/html ; charset=utf-8');
    assert.strictEqual(typeis(req, ['text/*']), 'text/html');
  });

  it('should ignore casing', () => {
    const req = createRequest('text/HTML');
    assert.strictEqual(typeis(req, ['text/*']), 'text/html');
  });

  it('should fail invalid type', () => {
    const req = createRequest('text/html**');
    assert.strictEqual(typeis(req, ['text/*']), false);
  });

  it('should not match invalid type', () => {
    const req = createRequest('text/html');
    assert.strictEqual(typeis(req, ['text/html/']), false);
    assert.strictEqual(
      typeis(req, [undefined, null, true, function () {}]),
      false,
    );
  });

  describe('when no body is given', () => {
    it('should return null', () => {
      const req = { headers: {} };

      assert.strictEqual(typeis(req), null);
      assert.strictEqual(typeis(req, ['image/*']), null);
      assert.strictEqual(typeis(req, 'image/*', 'text/*'), null);
    });
  });

  describe('when no content type is given', () => {
    it('should return false', () => {
      const req = createRequest();
      assert.strictEqual(typeis(req), false);
      assert.strictEqual(typeis(req, ['image/*']), false);
      assert.strictEqual(typeis(req, ['text/*', 'image/*']), false);
    });
  });

  describe('give no types', () => {
    it('should return the mime type', () => {
      const req = createRequest('image/png');
      assert.strictEqual(typeis(req), 'image/png');
    });
  });

  describe('given one type', () => {
    it('should return the type or false', () => {
      const req = createRequest('image/png');

      assert.strictEqual(typeis(req, ['png']), 'png');
      assert.strictEqual(typeis(req, ['.png']), '.png');
      assert.strictEqual(typeis(req, ['image/png']), 'image/png');
      assert.strictEqual(typeis(req, ['image/*']), 'image/png');
      assert.strictEqual(typeis(req, ['*/png']), 'image/png');

      assert.strictEqual(typeis(req, ['jpeg']), false);
      assert.strictEqual(typeis(req, ['.jpeg']), false);
      assert.strictEqual(typeis(req, ['image/jpeg']), false);
      assert.strictEqual(typeis(req, ['text/*']), false);
      assert.strictEqual(typeis(req, ['*/jpeg']), false);

      assert.strictEqual(typeis(req, ['bogus']), false);
      assert.strictEqual(typeis(req, ['something/bogus*']), false);
    });
  });

  describe('given multiple types', () => {
    it('should return the first match or false', () => {
      const req = createRequest('image/png');

      assert.strictEqual(typeis(req, ['png']), 'png');
      assert.strictEqual(typeis(req, '.png'), '.png');
      assert.strictEqual(typeis(req, ['text/*', 'image/*']), 'image/png');
      assert.strictEqual(typeis(req, ['image/*', 'text/*']), 'image/png');
      assert.strictEqual(typeis(req, ['image/*', 'image/png']), 'image/png');
      assert.strictEqual(typeis(req, 'image/png', 'image/*'), 'image/png');

      assert.strictEqual(typeis(req, ['jpeg']), false);
      assert.strictEqual(typeis(req, ['.jpeg']), false);
      assert.strictEqual(typeis(req, ['text/*', 'application/*']), false);
      assert.strictEqual(
        typeis(req, ['text/html', 'text/plain', 'application/json']),
        false,
      );
    });
  });

  describe('given +suffix', () => {
    it('should match suffix types', () => {
      const req = createRequest('application/vnd+json');

      assert.strictEqual(typeis(req, '+json'), 'application/vnd+json');
      assert.strictEqual(
        typeis(req, 'application/vnd+json'),
        'application/vnd+json',
      );
      assert.strictEqual(
        typeis(req, 'application/*+json'),
        'application/vnd+json',
      );
      assert.strictEqual(typeis(req, '*/vnd+json'), 'application/vnd+json');
      assert.strictEqual(typeis(req, 'application/json'), false);
      assert.strictEqual(typeis(req, 'text/*+json'), false);
    });
  });

  describe('given "*/*"', () => {
    it('should match any content-type', () => {
      assert.strictEqual(
        typeis(createRequest('text/html'), '*/*'),
        'text/html',
      );
      assert.strictEqual(typeis(createRequest('text/xml'), '*/*'), 'text/xml');
      assert.strictEqual(
        typeis(createRequest('application/json'), '*/*'),
        'application/json',
      );
      assert.strictEqual(
        typeis(createRequest('application/vnd+json'), '*/*'),
        'application/vnd+json',
      );
    });

    it('should not match invalid content-type', () => {
      assert.strictEqual(typeis(createRequest('bogus'), '*/*'), false);
    });

    it('should not match body-less request', () => {
      const req = { headers: { 'content-type': 'text/html' } };
      assert.strictEqual(typeis(req, '*/*'), null);
    });
  });

  describe('when Content-Type: application/x-www-form-urlencoded', () => {
    it('should match "urlencoded"', () => {
      const req = createRequest('application/x-www-form-urlencoded');

      assert.strictEqual(typeis(req, ['urlencoded']), 'urlencoded');
      assert.strictEqual(typeis(req, ['json', 'urlencoded']), 'urlencoded');
      assert.strictEqual(typeis(req, ['urlencoded', 'json']), 'urlencoded');
    });
  });

  describe('when Content-Type: multipart/form-data', () => {
    it('should match "multipart/*"', () => {
      const req = createRequest('multipart/form-data');

      assert.strictEqual(typeis(req, ['multipart/*']), 'multipart/form-data');
    });

    it('should match "multipart"', () => {
      const req = createRequest('multipart/form-data');

      assert.strictEqual(typeis(req, ['multipart']), 'multipart');
    });
  });
});

describe('typeis.hasBody(req)', () => {
  describe('content-length', () => {
    it('should indicate body', () => {
      const req = { headers: { 'content-length': '1' } };
      assert.strictEqual(typeis.hasBody(req), true);
    });

    it('should be true when 0', () => {
      const req = { headers: { 'content-length': '0' } };
      assert.strictEqual(typeis.hasBody(req), true);
    });

    it('should be false when bogus', () => {
      const req = { headers: { 'content-length': 'bogus' } };
      assert.strictEqual(typeis.hasBody(req), false);
    });
  });

  describe('transfer-encoding', () => {
    it('should indicate body', () => {
      const req = { headers: { 'transfer-encoding': 'chunked' } };
      assert.strictEqual(typeis.hasBody(req), true);
    });
  });
});

describe('typeis.is(mediaType, types)', () => {
  it('should ignore params', () => {
    assert.strictEqual(
      typeis.is('text/html; charset=utf-8', ['text/*']),
      'text/html',
    );
  });

  it('should ignore casing', () => {
    assert.strictEqual(typeis.is('text/HTML', ['text/*']), 'text/html');
  });

  it('should fail invalid type', () => {
    assert.strictEqual(typeis.is('text/html**', ['text/*']), false);
  });

  it('should not match invalid type', () => {
    const req = createRequest('text/html');
    assert.strictEqual(typeis(req, ['text/html/']), false);
    assert.strictEqual(
      typeis(req, [undefined, null, true, function () {}]),
      false,
    );
  });

  it('should not match invalid type', () => {
    assert.strictEqual(typeis.is('text/html', ['text/html/']), false);
    assert.strictEqual(
      typeis.is('text/html', [undefined, null, true, function () {}]),
      false,
    );
  });

  describe('when no media type is given', () => {
    it('should return false', () => {
      assert.strictEqual(typeis.is(), false);
      assert.strictEqual(typeis.is('', ['application/json']), false);
      assert.strictEqual(typeis.is(null, ['image/*']), false);
      assert.strictEqual(typeis.is(undefined, ['text/*', 'image/*']), false);
    });
  });

  describe('given no types', () => {
    it('should return the mime type', () => {
      assert.strictEqual(typeis.is('image/png'), 'image/png');
    });
  });

  describe('given one type', () => {
    it('should return the type or false', () => {
      assert.strictEqual(typeis.is('image/png', ['png']), 'png');
      assert.strictEqual(typeis.is('image/png', ['.png']), '.png');
      assert.strictEqual(typeis.is('image/png', ['image/png']), 'image/png');
      assert.strictEqual(typeis.is('image/png', ['image/*']), 'image/png');
      assert.strictEqual(typeis.is('image/png', ['*/png']), 'image/png');

      assert.strictEqual(typeis.is('image/png', ['jpeg']), false);
      assert.strictEqual(typeis.is('image/png', ['.jpeg']), false);
      assert.strictEqual(typeis.is('image/png', ['image/jpeg']), false);
      assert.strictEqual(typeis.is('image/png', ['text/*']), false);
      assert.strictEqual(typeis.is('image/png', ['*/jpeg']), false);

      assert.strictEqual(typeis.is('image/png', ['bogus']), false);
      assert.strictEqual(typeis.is('image/png', ['something/bogus*']), false);
    });
  });

  describe('given multiple types', () => {
    it('should return the first match or false', () => {
      assert.strictEqual(typeis.is('image/png', ['png']), 'png');
      assert.strictEqual(typeis.is('image/png', '.png'), '.png');
      assert.strictEqual(
        typeis.is('image/png', ['text/*', 'image/*']),
        'image/png',
      );
      assert.strictEqual(
        typeis.is('image/png', ['image/*', 'text/*']),
        'image/png',
      );
      assert.strictEqual(
        typeis.is('image/png', ['image/*', 'image/png']),
        'image/png',
      );
      assert.strictEqual(
        typeis.is('image/png', 'image/png', 'image/*'),
        'image/png',
      );

      assert.strictEqual(typeis.is('image/png', ['jpeg']), false);
      assert.strictEqual(typeis.is('image/png', ['.jpeg']), false);
      assert.strictEqual(
        typeis.is('image/png', ['text/*', 'application/*']),
        false,
      );
      assert.strictEqual(
        typeis.is('image/png', ['text/html', 'text/plain', 'application/json']),
        false,
      );
    });
  });

  describe('given +suffix', () => {
    it('should match suffix types', () => {
      assert.strictEqual(
        typeis.is('application/vnd+json', '+json'),
        'application/vnd+json',
      );
      assert.strictEqual(
        typeis.is('application/vnd+json', 'application/vnd+json'),
        'application/vnd+json',
      );
      assert.strictEqual(
        typeis.is('application/vnd+json', 'application/*+json'),
        'application/vnd+json',
      );
      assert.strictEqual(
        typeis.is('application/vnd+json', '*/vnd+json'),
        'application/vnd+json',
      );
      assert.strictEqual(
        typeis.is('application/vnd+json', 'application/json'),
        false,
      );
      assert.strictEqual(
        typeis.is('application/vnd+json', 'text/*+json'),
        false,
      );
    });
  });

  describe('given "*/*"', () => {
    it('should match any media type', () => {
      assert.strictEqual(typeis.is('text/html', '*/*'), 'text/html');
      assert.strictEqual(typeis.is('text/xml', '*/*'), 'text/xml');
      assert.strictEqual(
        typeis.is('application/json', '*/*'),
        'application/json',
      );
      assert.strictEqual(
        typeis.is('application/vnd+json', '*/*'),
        'application/vnd+json',
      );
    });

    it('should not match invalid media type', () => {
      assert.strictEqual(typeis.is('bogus', '*/*'), false);
    });
  });

  describe('when media type is application/x-www-form-urlencoded', () => {
    it('should match "urlencoded"', () => {
      assert.strictEqual(
        typeis.is('application/x-www-form-urlencoded', ['urlencoded']),
        'urlencoded',
      );
      assert.strictEqual(
        typeis.is('application/x-www-form-urlencoded', ['json', 'urlencoded']),
        'urlencoded',
      );
      assert.strictEqual(
        typeis.is('application/x-www-form-urlencoded', ['urlencoded', 'json']),
        'urlencoded',
      );
    });
  });

  describe('when media type is multipart/form-data', () => {
    it('should match "multipart/*"', () => {
      assert.strictEqual(
        typeis.is('multipart/form-data', ['multipart/*']),
        'multipart/form-data',
      );
    });

    it('should match "multipart"', () => {
      assert.strictEqual(
        typeis.is('multipart/form-data', ['multipart']),
        'multipart',
      );
    });
  });

  describe('when give request object', () => {
    it('should use the content-type header', () => {
      const req = createRequest('image/png');

      assert.strictEqual(typeis.is(req, ['png']), 'png');
      assert.strictEqual(typeis.is(req, ['jpeg']), false);
    });

    it('should not check for body', () => {
      const req = { headers: { 'content-type': 'text/html' } };

      assert.strictEqual(typeis.is(req, ['html']), 'html');
      assert.strictEqual(typeis.is(req, ['jpeg']), false);
    });
  });
});

describe('typeis.match(expected, actual)', () => {
  it('should return false when expected is false', () => {
    assert.strictEqual(typeis.match(false, 'text/html'), false);
  });

  it('should perform exact matching', () => {
    assert.strictEqual(typeis.match('text/html', 'text/html'), true);
    assert.strictEqual(typeis.match('text/html', 'text/plain'), false);
    assert.strictEqual(typeis.match('text/html', 'text/xml'), false);
    assert.strictEqual(typeis.match('text/html', 'application/html'), false);
    assert.strictEqual(typeis.match('text/html', 'text/html+xml'), false);
  });

  it('should perform type wildcard matching', () => {
    assert.strictEqual(typeis.match('*/html', 'text/html'), true);
    assert.strictEqual(typeis.match('*/html', 'application/html'), true);
    assert.strictEqual(typeis.match('*/html', 'text/xml'), false);
    assert.strictEqual(typeis.match('*/html', 'text/html+xml'), false);
  });

  it('should perform subtype wildcard matching', () => {
    assert.strictEqual(typeis.match('text/*', 'text/html'), true);
    assert.strictEqual(typeis.match('text/*', 'text/xml'), true);
    assert.strictEqual(typeis.match('text/*', 'text/html+xml'), true);
    assert.strictEqual(typeis.match('text/*', 'application/xml'), false);
  });

  it('should perform full wildcard matching', () => {
    assert.strictEqual(typeis.match('*/*', 'text/html'), true);
    assert.strictEqual(typeis.match('*/*', 'text/html+xml'), true);
    assert.strictEqual(typeis.match('*/*+xml', 'text/html+xml'), true);
  });

  it('should perform full wildcard matching with specific suffix', () => {
    assert.strictEqual(typeis.match('*/*+xml', 'text/html+xml'), true);
    assert.strictEqual(typeis.match('*/*+xml', 'text/html'), false);
  });
});

describe('typeis.normalize(type)', () => {
  it('should return false for non-strings', () => {
    assert.strictEqual(typeis.normalize({}), false);
    assert.strictEqual(typeis.normalize([]), false);
    assert.strictEqual(typeis.normalize(42), false);
    assert.strictEqual(typeis.normalize(null), false);
    assert.strictEqual(
      typeis.normalize(() => {}),
      false,
    );
  });

  it('should return media type for extension', () => {
    assert.strictEqual(typeis.normalize('json'), 'application/json');
  });

  it('should return expanded wildcard for suffix', () => {
    assert.strictEqual(typeis.normalize('+json'), '*/*+json');
  });

  it('should pass through media type', () => {
    assert.strictEqual(
      typeis.normalize('application/json'),
      'application/json',
    );
  });

  it('should pass through wildcard', () => {
    assert.strictEqual(typeis.normalize('*/*'), '*/*');
    assert.strictEqual(typeis.normalize('image/*'), 'image/*');
  });

  it('should return false for unmapped extension', () => {
    assert.strictEqual(typeis.normalize('unknown'), false);
  });

  it('should expand special "urlencoded"', () => {
    assert.strictEqual(
      typeis.normalize('urlencoded'),
      'application/x-www-form-urlencoded',
    );
  });

  it('should expand special "multipart"', () => {
    assert.strictEqual(typeis.normalize('multipart'), 'multipart/*');
  });
});

function createRequest(type) {
  return {
    headers: {
      'content-type': type || undefined,
      'transfer-encoding': 'chunked',
    },
  };
}
