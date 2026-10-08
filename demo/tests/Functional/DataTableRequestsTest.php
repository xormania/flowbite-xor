<?php

namespace App\Tests\Functional;

use App\Demo\DataTableCollector;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpKernel\Profiler\Profile;
use Symfony\UX\LiveComponent\Test\InteractsWithLiveComponents;

/**
 * What one request makes the demo's data tables do, read from the request's profile: the demo's DataTableCollector
 * records each countRows() and loadRows() call. A table request counts once and loads one page once, whatever it
 * asks for; a Live action that read the page does not read it again to render.
 */
final class DataTableRequestsTest extends WebTestCase
{
    use InteractsWithLiveComponents;

    /**
     * @return list<string>
     */
    private static function calls(KernelBrowser $client): array
    {
        $profile = $client->getProfile();
        self::assertInstanceOf(Profile::class, $profile, 'the request has a profile: enableProfiler() before it');
        $collector = $profile->getCollector(DataTableCollector::class);
        self::assertInstanceOf(DataTableCollector::class, $collector);

        return $collector->getCalls();
    }

    public function testATablePageCountsOnceAndLoadsOnePageOnce(): void
    {
        $client = static::createClient();
        $client->enableProfiler();

        $client->request('GET', '/lab/data-table-frame?page=2');

        self::assertResponseIsSuccessful();
        self::assertSame(['OrdersTable: count', 'OrdersTable: rows@10'], self::calls($client));
    }

    public function testAPagePastTheEndLoadsOnlyTheLastPage(): void
    {
        $client = static::createClient();
        $client->enableProfiler();

        $client->request('GET', '/lab/data-table-frame?page=1000000&size=50');

        self::assertResponseIsSuccessful();
        self::assertSame(['OrdersTable: count', 'OrdersTable: rows@50'], self::calls($client), '57 rows: the 2nd page of 50');
    }

    public function testALiveTablePageCountsOnceAndLoadsOnce(): void
    {
        $client = static::createClient();
        $client->enableProfiler();

        $client->request('GET', '/lab/data-table-live');

        self::assertResponseIsSuccessful();
        self::assertSame(['LiveOrdersTable: count', 'LiveOrdersTable: rows@0'], self::calls($client));
    }

    public function testALiveActionThatReadThePageDoesNotReadItAgainToRender(): void
    {
        $client = static::createClient();
        $table = $this->createLiveComponent('OrdersTable', [], $client)->refresh();

        $client->enableProfiler();
        $table->call('selectPage');

        self::assertSame(['LiveOrdersTable: count', 'LiveOrdersTable: rows@0'], self::calls($client));
    }
}
