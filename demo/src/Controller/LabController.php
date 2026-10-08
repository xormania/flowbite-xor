<?php

namespace App\Controller;

use App\Demo\OrdersTable;
use App\Form\AutocompleteDemoType;
use App\Kit\KitReader;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Symfony\UX\Turbo\TurboBundle;

/**
 * Turbo / Live Component scenario pages (one route per scenario under /lab/), each exercised by
 * tests/e2e/lab.*.spec.ts.
 */
#[Route('/lab')]
final class LabController extends AbstractController
{
    /**
     * Scenario name => description; each scenario gets its own "/lab/<name>" route.
     */
    private const SCENARIOS = [
        'live-dropdown' => 'A Dropdown open while its Live Component re-renders (action and model change).',
        'live-modal' => 'A Modal (<dialog>) across Live re-renders, open and closed.',
        'live-table' => 'A Live table re-sorting rows that hold Dropdowns and Tooltips.',
        'live-form' => 'A form rendered by the form theme in a Live Component: changed fields are validated on the server, focus and typed values survive the re-render.',
        'live-drawer' => 'A modal Drawer across Live re-renders, and a non-modal Drawer beside the page.',
        'turbo-nav' => 'Turbo Drive visits between two pages: a data-turbo-permanent Sidebar keeps its scroll, collapsed state and current item, the theme persists, a flash toast is not duplicated, an Avatar shows its picture.',
        'turbo-stream-toast' => 'A form whose Turbo Stream response appends a Toast to the region: it appears, pauses while hovered, dismisses itself, and focus stays put.',
        'turbo-frame-detail' => 'A list and a detail Turbo Frame holding a Dropdown, reloaded several times.',
        'permanent-plus-live' => 'A Live Component inside a data-turbo-permanent element across Turbo visits.',
        'data-table-live' => 'A Live DataTable: its state in the URL across Turbo visits and Back, rows selected across pages, values the table does not accept normalized.',
        'data-table-live-frame' => 'A Live DataTable inside a Turbo Frame that reloads: the reloaded table is live again.',
        'data-table-live-permanent' => 'A Live DataTable inside a data-turbo-permanent element: it keeps its state across Turbo visits.',
        'data-table-live-stream' => 'A Live DataTable replaced and updated by Turbo Streams: it reconnects and starts from the server state.',
        'autocomplete' => 'Autocomplete fields in a Symfony form (one choice, several, a remote search) and the Autocomplete component outside a form, across Turbo visits and Back.',
        'autocomplete-frame' => 'An Autocomplete inside a Turbo Frame that reloads.',
        'autocomplete-stream' => 'An Autocomplete replaced by a Turbo Stream.',
        'live-autocomplete' => 'Autocomplete fields in a Live form that re-renders.',
        'popover-turbo' => 'Popovers across Turbo visits and Back: a plain one, a group, one inside a data-turbo-permanent element, one inside a Turbo Frame that reloads.',
        'popover-stream' => 'A Popover replaced and updated by Turbo Streams.',
        'live-popover' => 'A Popover open while its Live Component re-renders (action and model change).',
        'calendar-turbo' => 'Calendars in a GET form (one date, a range, several dates) across Turbo visits and Back, one inside a data-turbo-permanent element, one inside a Turbo Frame that reloads.',
        'calendar-stream' => 'A Calendar replaced and updated by Turbo Streams.',
        'live-calendar' => 'Calendars bound to Live Component properties: a date, a range, bounds and a locale changed by the server.',
        'date-picker-turbo' => 'Date pickers across Turbo visits and Back: one in a GET form, one inside a data-turbo-permanent element, one inside a Turbo Frame that reloads.',
        'date-picker-stream' => 'A DatePicker replaced and updated by Turbo Streams.',
        'live-date-picker' => 'Date pickers in a Live form through the form theme: each pick reaches the server, and the end date follows the start.',
        'dropzone-turbo' => 'Dropzones across Turbo visits and Back (one file, several files), one inside a data-turbo-permanent element, and one in a multipart form inside a Turbo Frame that reloads and submits.',
        'dropzone-stream' => 'A Dropzone replaced and updated by Turbo Streams.',
        'data-table-frame' => 'A DataTable in its Turbo Frame: search, filter, sort, page and page size each add a history entry that Back and Forward walk through, in the same document.',
    ];

    private const ITEMS = ['apple' => 'Apple', 'banana' => 'Banana', 'cherry' => 'Cherry'];

    public function __construct(
        private readonly KitReader $kit,
    ) {
    }

    #[Route('', name: 'app_lab')]
    public function index(): Response
    {
        return $this->render('lab/index.html.twig', ['scenarios' => self::SCENARIOS]);
    }

    #[Route('/live-dropdown', name: 'app_lab_live_dropdown')]
    #[Route('/live-modal', name: 'app_lab_live_modal')]
    #[Route('/live-table', name: 'app_lab_live_table')]
    #[Route('/live-drawer', name: 'app_lab_live_drawer')]
    #[Route('/live-form', name: 'app_lab_live_form')]
    #[Route('/live-date-picker', name: 'app_lab_live_date_picker')]
    #[Route('/live-calendar', name: 'app_lab_live_calendar')]
    #[Route('/live-popover', name: 'app_lab_live_popover')]
    #[Route('/live-autocomplete', name: 'app_lab_live_autocomplete')]
    public function live(string $_route): Response
    {
        $name = str_replace('_', '-', substr($_route, \strlen('app_lab_')));

        return $this->render('lab/live.html.twig', [
            'name' => $name,
            'description' => self::SCENARIOS[$name],
            'component' => 'Lab:'.str_replace(' ', '', ucwords(str_replace('-', ' ', $name))),
        ]);
    }

    #[Route('/turbo-nav/{page}', name: 'app_lab_turbo_nav', requirements: ['page' => 'one|two'], defaults: ['page' => 'one'])]
    public function turboNav(string $page): Response
    {
        return $this->render('lab/turbo_nav.html.twig', [
            'page' => $page,
            'description' => self::SCENARIOS['turbo-nav'],
            'recipes' => $this->kit->getRecipes(),
        ]);
    }

    #[Route('/turbo-nav/save', name: 'app_lab_turbo_nav_save', methods: ['POST'])]
    public function turboNavSave(): Response
    {
        $this->addFlash('success', 'Settings saved.');

        return $this->redirectToRoute('app_lab_turbo_nav', ['page' => 'two'], Response::HTTP_SEE_OTHER);
    }

    #[Route('/turbo-stream-toast', name: 'app_lab_turbo_stream_toast', methods: ['GET', 'POST'])]
    public function turboStreamToast(Request $request): Response
    {
        if ($request->isMethod('POST')) {
            $request->setRequestFormat(TurboBundle::STREAM_FORMAT);

            return $this->render('lab/turbo_stream_toast.stream.html.twig', [
                'count' => $request->request->getInt('count') + 1,
                'timeout' => max(0, $request->request->getInt('timeout', 5000)),
            ]);
        }

        return $this->render('lab/turbo_stream_toast.html.twig', ['description' => self::SCENARIOS['turbo-stream-toast']]);
    }

    #[Route('/turbo-frame-detail/{item}', name: 'app_lab_turbo_frame_detail', defaults: ['item' => null])]
    public function turboFrameDetail(?string $item): Response
    {
        if (null !== $item && !isset(self::ITEMS[$item])) {
            throw $this->createNotFoundException();
        }

        return $this->render('lab/turbo_frame_detail.html.twig', [
            'items' => self::ITEMS,
            'item' => $item,
            'description' => self::SCENARIOS['turbo-frame-detail'],
        ]);
    }

    #[Route('/permanent-plus-live/{page}', name: 'app_lab_permanent_plus_live', requirements: ['page' => 'one|two'], defaults: ['page' => 'one'])]
    public function permanentPlusLive(string $page): Response
    {
        return $this->render('lab/permanent_plus_live.html.twig', ['page' => $page, 'description' => self::SCENARIOS['permanent-plus-live']]);
    }

    #[Route('/data-table-frame', name: 'app_lab_data_table_frame')]
    public function dataTableFrame(Request $request, OrdersTable $orders): Response
    {
        return $this->render('lab/data_table_frame.html.twig', [
            'table' => $orders->handleRequest($request),
            'description' => self::SCENARIOS['data-table-frame'],
        ]);
    }

    #[Route('/data-table-live', name: 'app_lab_data_table_live')]
    public function dataTableLive(): Response
    {
        return $this->render('lab/data_table_live.html.twig', ['description' => self::SCENARIOS['data-table-live']]);
    }

    #[Route('/data-table-live-frame', name: 'app_lab_data_table_live_frame')]
    public function dataTableLiveFrame(Request $request): Response
    {
        return $this->render('lab/data_table_live_frame.html.twig', [
            'description' => self::SCENARIOS['data-table-live-frame'],
            'load' => $request->query->getInt('load'),
        ]);
    }

    #[Route('/data-table-live-permanent/{page}', name: 'app_lab_data_table_live_permanent', requirements: ['page' => 'one|two'], defaults: ['page' => 'one'])]
    public function dataTableLivePermanent(string $page): Response
    {
        return $this->render('lab/data_table_live_permanent.html.twig', ['page' => $page, 'description' => self::SCENARIOS['data-table-live-permanent']]);
    }

    #[Route('/data-table-live-stream', name: 'app_lab_data_table_live_stream', methods: ['GET', 'POST'])]
    public function dataTableLiveStream(Request $request): Response
    {
        if ($request->isMethod('POST')) {
            $request->setRequestFormat(TurboBundle::STREAM_FORMAT);

            return $this->render('lab/data_table_live_stream.stream.html.twig', [
                'action' => 'update' === $request->request->get('action') ? 'update' : 'replace',
            ]);
        }

        return $this->render('lab/data_table_live_stream.html.twig', ['description' => self::SCENARIOS['data-table-live-stream']]);
    }

    #[Route('/autocomplete', name: 'app_lab_autocomplete', methods: ['GET', 'POST'])]
    public function autocomplete(Request $request): Response
    {
        $form = $this->createForm(AutocompleteDemoType::class);
        $form->handleRequest($request);
        if ($form->isSubmitted() && $form->isValid()) {
            $data = $form->getData();

            return $this->redirectToRoute('app_lab_autocomplete', ['submitted' => \sprintf('%s; %s; %s', $data['country'], implode(',', $data['languages']), $data['customer'] ?? '-')], Response::HTTP_SEE_OTHER);
        }

        return $this->render('lab/autocomplete.html.twig', [
            'form' => $form,
            'submitted' => $request->query->getString('submitted'),
            'description' => self::SCENARIOS['autocomplete'],
        ], new Response(null, $form->isSubmitted() ? 422 : 200));
    }

    #[Route('/autocomplete-frame', name: 'app_lab_autocomplete_frame')]
    public function autocompleteFrame(Request $request): Response
    {
        return $this->render('lab/autocomplete_frame.html.twig', ['load' => $request->query->getInt('load'), 'description' => self::SCENARIOS['autocomplete-frame']]);
    }

    #[Route('/autocomplete-stream', name: 'app_lab_autocomplete_stream', methods: ['GET', 'POST'])]
    public function autocompleteStream(Request $request): Response
    {
        if ($request->isMethod('POST')) {
            $request->setRequestFormat(TurboBundle::STREAM_FORMAT);

            return $this->render('lab/autocomplete_stream.stream.html.twig', ['count' => 1]);
        }

        return $this->render('lab/autocomplete_stream.html.twig', ['description' => self::SCENARIOS['autocomplete-stream']]);
    }

    #[Route('/popover-turbo/{page}', name: 'app_lab_popover_turbo', requirements: ['page' => 'one|two'], defaults: ['page' => 'one'])]
    public function popoverTurbo(Request $request, string $page): Response
    {
        return $this->render('lab/popover_turbo.html.twig', [
            'page' => $page,
            'load' => $request->query->getInt('load'),
            'description' => self::SCENARIOS['popover-turbo'],
        ]);
    }

    #[Route('/popover-stream', name: 'app_lab_popover_stream', methods: ['GET', 'POST'])]
    public function popoverStream(Request $request): Response
    {
        if ($request->isMethod('POST')) {
            $request->setRequestFormat(TurboBundle::STREAM_FORMAT);

            return $this->render('lab/popover_stream.stream.html.twig', [
                'action' => 'update' === $request->request->get('action') ? 'update' : 'replace',
            ]);
        }

        return $this->render('lab/popover_stream.html.twig', ['description' => self::SCENARIOS['popover-stream']]);
    }

    #[Route('/calendar-turbo/{page}', name: 'app_lab_calendar_turbo', requirements: ['page' => 'one|two'], defaults: ['page' => 'one'])]
    public function calendarTurbo(Request $request, string $page): Response
    {
        $stay = $request->query->all('stay');
        $dates = $request->query->all('dates');

        return $this->render('lab/calendar_turbo.html.twig', [
            'page' => $page,
            'load' => $request->query->getInt('load'),
            'submitted' => $request->query->has('day') ? [
                'day' => $request->query->getString('day'),
                'stay' => implode('..', array_map('strval', [$stay['from'] ?? '', $stay['to'] ?? ''])),
                'dates' => implode(',', array_map('strval', $dates)),
            ] : null,
            'description' => self::SCENARIOS['calendar-turbo'],
        ]);
    }

    #[Route('/calendar-stream', name: 'app_lab_calendar_stream', methods: ['GET', 'POST'])]
    public function calendarStream(Request $request): Response
    {
        if ($request->isMethod('POST')) {
            $request->setRequestFormat(TurboBundle::STREAM_FORMAT);

            return $this->render('lab/calendar_stream.stream.html.twig', [
                'action' => 'update' === $request->request->get('action') ? 'update' : 'replace',
            ]);
        }

        return $this->render('lab/calendar_stream.html.twig', ['description' => self::SCENARIOS['calendar-stream']]);
    }

    #[Route('/date-picker-turbo/{page}', name: 'app_lab_date_picker_turbo', requirements: ['page' => 'one|two'], defaults: ['page' => 'one'])]
    public function datePickerTurbo(Request $request, string $page): Response
    {
        return $this->render('lab/date_picker_turbo.html.twig', [
            'page' => $page,
            'load' => $request->query->getInt('load'),
            'submitted' => $request->query->has('due') ? $request->query->getString('due') : null,
            'description' => self::SCENARIOS['date-picker-turbo'],
        ]);
    }

    #[Route('/date-picker-stream', name: 'app_lab_date_picker_stream', methods: ['GET', 'POST'])]
    public function datePickerStream(Request $request): Response
    {
        if ($request->isMethod('POST')) {
            $request->setRequestFormat(TurboBundle::STREAM_FORMAT);

            return $this->render('lab/date_picker_stream.stream.html.twig', [
                'action' => 'update' === $request->request->get('action') ? 'update' : 'replace',
            ]);
        }

        return $this->render('lab/date_picker_stream.html.twig', ['description' => self::SCENARIOS['date-picker-stream']]);
    }

    #[Route('/dropzone-turbo/{page}', name: 'app_lab_dropzone_turbo', requirements: ['page' => 'one|two'], defaults: ['page' => 'one'], methods: ['GET', 'POST'])]
    public function dropzoneTurbo(Request $request, ValidatorInterface $validator, string $page): Response
    {
        $error = null;
        // the multipart form inside the Turbo Frame: a 303 back into the frame, or a 422 with the error in it
        if ($request->isMethod('POST')) {
            $file = $request->files->get('framed');
            $violations = $validator->validate($file, [new Assert\NotNull(message: 'Choose an image.'), new Assert\Image(maxSize: '1M')]);
            if (0 === \count($violations) && $file instanceof UploadedFile) {
                return $this->redirectToRoute('app_lab_dropzone_turbo', ['page' => $page, 'framed' => $file->getClientOriginalName()], Response::HTTP_SEE_OTHER);
            }
            $error = (string) $violations[0]?->getMessage();
        }

        return $this->render('lab/dropzone_turbo.html.twig', [
            'page' => $page,
            'load' => $request->query->getInt('load'),
            'framed' => $request->query->getString('framed'),
            'error' => $error,
            'description' => self::SCENARIOS['dropzone-turbo'],
        ], new Response(null, null === $error ? 200 : 422));
    }

    #[Route('/dropzone-stream', name: 'app_lab_dropzone_stream', methods: ['GET', 'POST'])]
    public function dropzoneStream(Request $request): Response
    {
        if ($request->isMethod('POST')) {
            $request->setRequestFormat(TurboBundle::STREAM_FORMAT);

            return $this->render('lab/dropzone_stream.stream.html.twig', [
                'action' => 'update' === $request->request->get('action') ? 'update' : 'replace',
            ]);
        }

        return $this->render('lab/dropzone_stream.html.twig', ['description' => self::SCENARIOS['dropzone-stream']]);
    }
}
